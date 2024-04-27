// Copyright 2024 mik
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

use std::{ collections::HashMap, sync::Arc };
use tauri::{ AppHandle, Manager, Runtime };
use tokenizer::encode;
use tokio::{ spawn, sync::mpsc::channel };
use bytes::Bytes;

use crate::{
    store::{ Provider, ProviderMetadata, ProviderType, ServerConfiguration, ServerParameters },
    utils::http_client::{ HttpError, NewHttpError },
    OplaContext,
    Payload,
    ServerStatus,
};

use self::{
    llama_cpp::LlamaCppInferenceClient,
    llm::{
        LlmCompletionOptions,
        LlmCompletionResponse,
        LlmError,
        LlmInferenceClient,
        LlmQuery,
        LlmQueryCompletion,
        LlmTokenizeResponse,
    },
};

pub mod openai;
pub mod llama_cpp;
pub mod llm;

#[derive(Clone)]
pub struct Worker {
    pub id: String,
    pub created: i64,
    pub client: Box<dyn LlmInferenceClient + Send + Sync>,
}

impl Worker {
    pub fn new(id: &str, client: Box<dyn LlmInferenceClient + Send + Sync>) -> Self {
        Worker { id: id.to_string(), created: chrono::Utc::now().timestamp_millis(), client }
    }

    pub fn deserialize_response_error<E>(&mut self, response: Result<Bytes, E>) -> E
        where E: NewHttpError
    {
        match response {
            Ok(full) => {
                match self.client.deserialize_response_error(&full) {
                    Ok(err) => E::new(&err.error.message, &err.error.status),
                    Err(err) => E::new(&err.message, &err.status),
                }
            }
            Err(err) => err,
        }
    }

    pub fn build_stream_chunk<E>(&mut self, data: String, created: i64) -> Result<Option<String>, E>
        where E: NewHttpError
    {
        self.client.build_stream_chunk(data, created).map_err(|e| E::new(&e.message, &e.status))
    }

    pub fn handle_input_response(&mut self) {}

    pub fn handle_chunk_response(&mut self) {}

    pub fn response_to_output(&mut self) {}

    pub fn to_err(&mut self) {}
}

#[derive(Clone)]
pub struct ProvidersManager {
    clients: HashMap<String, Box<dyn LlmInferenceClient + 'static + Send + Sync>>,
    completion_handles: HashMap<String, Arc<tokio::task::AbortHandle>>,
}

impl ProvidersManager {
    pub fn new() -> Self {
        let mut clients: HashMap<
            String,
            Box<dyn LlmInferenceClient + Send + Sync>
        > = HashMap::new();
        clients.insert(String::from("opla"), Box::new(LlamaCppInferenceClient::new(None)));
        ProvidersManager {
            clients,
            completion_handles: HashMap::new(),
        }
    }

    pub fn get_opla_provider(server: ServerConfiguration) -> Provider {
        Provider {
            name: "Opla".to_string(),
            r#type: ProviderType::Opla.to_string(),
            description: Some("Opla is a free and open source AI assistant.".to_string()),
            url: format!("{:}:{:}", server.parameters.host.clone(), server.parameters.port.clone()),
            disabled: Some(false),
            key: None,
            doc_url: Some("https://opla.ai/docs".to_string()),
            metadata: Option::Some(ProviderMetadata {
                server: Some(server.clone()),
            }),
        }
    }

    async fn bind_local_server<R: Runtime>(
        &self,
        app: AppHandle<R>,
        model: String
    ) -> Result<ServerParameters, String> {
        let context = app.state::<OplaContext>();
        let context_server = Arc::clone(&context.server);

        let model_path = {
            let store = context.store.lock().await;
            let result = store.models.get_model(model.as_str());
            let model = match result {
                Some(model) => model.clone(),
                None => {
                    return Err(format!("Model not found: {:?}", model));
                }
            };
            let res = store.models.get_model_path(model.name.clone());
            let model_path = match res {
                Ok(m) => { m }
                Err(err) => {
                    return Err(format!("Opla server not started model not found: {:?}", err));
                }
            };
            drop(store);

            model_path
        };
        let mut server = context_server.lock().await;
        // let query = query.clone();
        // let conversation_id = query.options.conversation_id.clone();
        let parameters = match server.parameters.clone() {
            Some(mut p) => {
                p.model_id = Some(model.clone());
                p.model_path = Some(model_path);
                p
            }
            None => {
                return Err(
                    LlmError::new(
                        "Opla server not started no parameters found",
                        "server_error"
                    ).to_string()
                );
            }
        };

        server.bind::<R>(app.app_handle(), &parameters).await.map_err(|err| err.to_string())?;
        Ok(parameters)
    }

    async fn build_inference_client<R: Runtime>(
        &self,
        app: AppHandle<R>,
        model: String,
        client_name: String
    ) -> Result<Box<dyn LlmInferenceClient + Send + Sync>, String> {
        let client = match self.clients.get(&client_name) {
            Some(c) => c,
            None => {
                return Err(format!("Inference client not found: {:?}", client_name));
            }
        };
        // TODO if local inference client
        let parameters = self.bind_local_server(app, model).await?;
        // let mut client_instance = client.create(server.parameters);
        let mut client = client.clone();
        client.set_parameters(parameters);
        Ok(client)
    }

    pub async fn cancel_completion(&mut self, conversation_id: &str) -> Result<(), String> {
        let handle = self.completion_handles.remove(conversation_id);
        println!("Cancel completion {}", conversation_id);
        match handle {
            Some(h) => {
                h.abort();
            }
            None => {
                let err = format!("cancel_completion Handle not found {}", conversation_id);
                println!("{}", err);
                return Err(err);
            }
        }

        Ok(())
    }

    pub async fn llm_cancel_completion<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        llm_provider: Option<Provider>,
        conversation_id: &str
    ) -> Result<(), String> {
        let context = app.state::<OplaContext>();
        let (_llm_provider, llm_provider_type) = match llm_provider {
            Some(p) => { (p.clone(), p.r#type) }
            None => {
                let store = context.store.lock().await;
                let server = store.server.clone();
                (ProvidersManager::get_opla_provider(server), "opla".to_string())
            }
        };
        println!("llm_cancel_completion {} {}", llm_provider_type, conversation_id);
        if llm_provider_type == "opla" {
            self.cancel_completion(conversation_id).await
        } else {
            return Err(String::from("Not implemented"));
        }
    }

    pub async fn request_completion<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        conversation_id: &str,
        message_id: &str,
        query: LlmQuery<LlmQueryCompletion>,
        completion_options: Option<LlmCompletionOptions>,
        inference_client: &Box<dyn LlmInferenceClient + Send + Sync>
    ) -> Result<(), String> {
        // let is_stream = query.options.get_parameter_as_boolean("stream").unwrap_or(false);
        let (sender, mut receiver) = channel::<Result<LlmCompletionResponse, LlmError>>(1);

        let query = query.clone();
        let completion_options = completion_options.clone();
        let mut worker = Worker::new(conversation_id, inference_client.clone());
        let mut inference_client = inference_client.clone();
        let handle = spawn(async move {
            inference_client.call_completion(&query, completion_options, &mut worker, sender).await
        });

        self.completion_handles.insert(
            conversation_id.to_string(),
            Arc::new(handle.abort_handle())
        );

        let mut result: Result<LlmCompletionResponse, String> = Err(
            String::from("Not initialized")
        );

        while let Some(response) = receiver.recv().await {
            println!("received {:?}", response);
            result = match response {
                Ok(response) => {
                    let mut response = response.clone();
                    response.conversation_id = Some(conversation_id.to_string());
                    response.message_id = Some(message_id.to_string());
                    let _ = app
                        .emit_all("opla-sse", response.clone())
                        .map_err(|err| err.to_string());
                    Ok(response.clone())
                }
                Err(err) => {
                    let _ = app
                        .emit_all("opla-sse", Payload {
                            message: err.to_string(),
                            status: ServerStatus::Error.as_str().to_string(),
                        })
                        .map_err(|err| err.to_string());
                    Err(err.to_string())
                }
            };
        }
        self.completion_handles.remove(&conversation_id.to_string());
        println!("call completion result {:?}", result);
        Ok(())
    }

    pub async fn llm_call_completion<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        model: &str,
        llm_provider: Option<Provider>,
        query: LlmQuery<LlmQueryCompletion>,
        completion_options: Option<LlmCompletionOptions>
    ) -> Result<(), String> {
        let context = app.state::<OplaContext>();
        let (llm_provider, llm_provider_type) = match llm_provider {
            Some(p) => { (p.clone(), p.r#type) }
            None => {
                let store = context.store.lock().await;
                let server = store.server.clone();
                (ProvidersManager::get_opla_provider(server), "opla".to_string())
            }
        };
        let conversation_id = match query.options.conversation_id.clone() {
            Some(id) => id,
            None => {
                return Err(format!("llm_call_completionError: need a conversation id"));
            }
        };
        let message_id = match query.options.message_id.clone() {
            Some(id) => id,
            None => {
                return Err(format!("llm_call_completionError: need a message id"));
            }
        };
        if llm_provider_type == "opla" {
            let client = self.build_inference_client(
                app.app_handle(),
                model.to_string(),
                llm_provider_type
            ).await?;
            let handle = app.app_handle();
            let response = self.request_completion::<R>(
                handle,
                &conversation_id,
                &message_id,
                query,
                completion_options,
                &client.clone()
            ).await;

            // server.set_parameters(Some(parameters));

            let mut store = context.store.lock().await;
            store.set_local_active_model_id(&model);
            store.save().map_err(|err| err.to_string())?;
            // println!("Opla call completion: {:?}", response);
            return Ok(response?);
        }
        if llm_provider_type == "openai" || llm_provider_type == "server" {
            let response = {
                let api = format!("{:}", llm_provider.url);
                let secret_key = match llm_provider.key {
                    Some(k) => { k }
                    None => {
                        if llm_provider_type == "openai" {
                            return Err(
                                format!("OpenAI provider key not set: {:?}", llm_provider_type)
                            );
                        }
                        ' '.to_string()
                    }
                };
                // let model = model;
                let query = query.clone();
                let conversation_id = query.options.conversation_id.clone();
                openai
                    ::call_completion::<R>(
                        &api,
                        &secret_key,
                        &model,
                        query,
                        completion_options,
                        Some(|result: Result<LlmCompletionResponse, LlmError>| {
                            match result {
                                Ok(response) => {
                                    let mut response = response.clone();
                                    response.conversation_id = conversation_id.clone();
                                    let _ = app
                                        .emit_all("opla-sse", response)
                                        .map_err(|err| err.to_string());
                                }
                                Err(err) => {
                                    let _ = app
                                        .emit_all("opla-sse", err)
                                        .map_err(|err| err.to_string());
                                }
                            }
                        })
                    ).await
                    .map_err(|err| err.to_string())?
            };
            let _ = app.emit_all("opla-sse", response).map_err(|err| err.to_string());
            return Ok(());
        }
        return Err(format!("LLM provider not found: {:?}", llm_provider_type));
    }

    pub async fn llm_call_tokenize<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        model: String,
        provider: Provider,
        text: String
    ) -> Result<LlmTokenizeResponse, String> {
        let llm_provider_type = provider.r#type;
        if llm_provider_type == "opla" {
            // let context = app.state::<OplaContext>();
            // let context_server = Arc::clone(&context.server);
            // let mut server = context_server.lock().await;
            let client = self.build_inference_client(
                app.app_handle(),
                model.to_string(),
                llm_provider_type
            ).await?;
            let response = client
                .clone()
                .call_tokenize(&model, text).await
                .map_err(|err| err.to_string())?;
            /* let response = server
                .call_tokenize::<R>(&model, text).await
                .map_err(|err| err.to_string())?; */
            return Ok(response);
        } else if llm_provider_type == "openai" {
            let encoded = match encode(text, model, None) {
                Ok(e) => { e }
                Err(err) => {
                    return Err(format!("LLM encode error: {:?}", err));
                }
            };
            let tokens: Vec<u64> = encoded
                .iter()
                .map(|&x| x as u64)
                .collect();
            println!("Tokens: {:?}", tokens);
            let response = LlmTokenizeResponse {
                tokens,
            };
            return Ok(response);
        }
        return Err(format!("LLM provider not found: {:?}", llm_provider_type));
    }
}
