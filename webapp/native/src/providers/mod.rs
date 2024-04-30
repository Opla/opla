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
// use futures_util::FutureExt;
use serde::Serialize;
use tauri::{ AppHandle, Manager, Runtime };
use tokenizer::encode;
use tokio::{ spawn, sync::Mutex };
use bytes::Bytes;

use crate::{
    store::{ Provider, ProviderMetadata, ProviderType, ServerConfiguration, ServerParameters },
    utils::http_client::{ HttpChunk, NewHttpError },
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
        LlmInferenceInterface,
        LlmQuery,
        LlmQueryCompletion,
        LlmResponseImpl,
        LlmTokenizeResponse,
    },
};

pub mod openai;
pub mod llama_cpp;
pub mod llm;
pub mod services;
#[derive(Clone)]
pub struct ProviderAdapter {
    pub id: String,
    pub created: i64,
    pub content: String,
    pub interface: Box<dyn LlmInferenceInterface + Send + Sync>,
}

impl ProviderAdapter {
    pub fn new(id: &str, interface: Box<dyn LlmInferenceInterface + Send + Sync>) -> Self {
        ProviderAdapter {
            id: id.to_string(),
            content: String::new(),
            created: chrono::Utc::now().timestamp_millis(),
            interface,
        }
    }

    pub fn reset_content(&mut self) {
        self.content = String::new();
        self.created = chrono::Utc::now().timestamp_millis();
    }

    pub fn serialize_parameters<S, E>(&mut self, json: S) -> Result<Vec<u8>, E>
        where E: NewHttpError, S: Serialize
    {
        serde_json::to_vec::<S>(&json).map_err(|e| E::new(&e.to_string(), "ProviderAdapter"))
    }

    pub fn deserialize_response<D: LlmResponseImpl, E>(&mut self, full: Bytes) -> Result<D, E>
        where E: NewHttpError
    {
        match self.interface.deserialize_response(&full) {
            Ok(response) => Ok(D::completion_to(response)),
            Err(err) => Err(E::new(&err.message, &err.status)),
        }
    }

    pub fn deserialize_response_error<E>(&mut self, response: Result<Bytes, E>) -> E
        where E: NewHttpError
    {
        match response {
            Ok(full) => {
                match self.interface.deserialize_response_error(&full) {
                    Ok(err) => E::new(&err.error.message, &err.error.status),
                    Err(err) => E::new(&err.message, &err.status),
                }
            }
            Err(err) => err,
        }
    }

    pub fn build_stream_chunk<E>(&mut self, data: String) -> Result<Option<String>, E>
        where E: NewHttpError
    {
        self.interface
            .build_stream_chunk(data, self.created)
            .map_err(|e| E::new(&e.message, &e.status))
    }

    pub fn handle_input_response(&mut self) {}

    pub fn handle_chunk_response<R, E>(&mut self, data: String) -> (bool, Result<R, E>)
        where R: HttpChunk, E: NewHttpError
    {
        let chunk = self.build_stream_chunk::<E>(data);
        match chunk {
            Ok(r) => {
                let mut stop = false;
                let response = match r {
                    Some(chunk_content) => {
                        self.content.push_str(chunk_content.as_str());
                        R::new(chrono::Utc::now().timestamp_millis(), "success", &chunk_content)
                    }
                    None => {
                        stop = true;
                        R::new(chrono::Utc::now().timestamp_millis(), "finished", "done")
                    }
                };
                return (stop, Ok(response));
            }
            Err(e) => {
                return (false, Err(e));
            }
        }
    }

    pub fn response_to_output<R: LlmResponseImpl, E>(&mut self) -> Result<R, E> {
        // let end_time = 0;
        let response = R::new(self.created, "finished", &self.content);
        Ok(response)
    }

    pub fn to_err(&mut self) {}
}

#[derive(Clone)]
pub struct ProvidersManager {
    interfaces: HashMap<String, Box<dyn LlmInferenceInterface + 'static + Send + Sync>>,
    completion_handles: Arc<Mutex<HashMap<String, Arc<tokio::task::AbortHandle>>>>,
}

impl ProvidersManager {
    pub fn new() -> Self {
        let mut interfaces: HashMap<
            String,
            Box<dyn LlmInferenceInterface + Send + Sync>
        > = HashMap::new();
        interfaces.insert(String::from("opla"), Box::new(LlamaCppInferenceClient::new(None)));
        ProvidersManager {
            interfaces,
            completion_handles: Arc::new(Mutex::new(HashMap::new())),
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

    async fn create_interface<R: Runtime>(
        &self,
        app: AppHandle<R>,
        model: String,
        provider_name: String
    ) -> Result<Box<dyn LlmInferenceInterface + Send + Sync>, String> {
        let interface = match self.interfaces.get(&provider_name) {
            Some(c) => c,
            None => {
                return Err(format!("Inference interface not found: {:?}", provider_name));
            }
        };
        // TODO if local inference client
        let parameters = self.bind_local_server(app, model).await?;
        // let mut client_instance = client.create(server.parameters);
        let mut interface = interface.clone();
        interface.set_parameters(parameters);
        Ok(interface)
    }

    pub async fn llm_cancel_completion<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        llm_provider: Option<Provider>,
        conversation_id: &str,
        message_id: &str
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
            // self.cancel_completion(conversation_id).await
            let mut completion_handles = self.completion_handles.lock().await;
            let handle = completion_handles.remove(conversation_id);
            println!("Cancel completion {}", conversation_id);
            let _ = app
                .emit_all("opla-sse", LlmCompletionResponse {
                    created: None,
                    status: Some(String::from("cancel")),
                    content: String::from(""),
                    conversation_id: Some(conversation_id.to_string()),
                    message_id: Some(message_id.to_string()),
                    usage: None,
                    message: None,
                })
                .map_err(|err| err.to_string());
            match handle {
                Some(h) => {
                    h.abort();
                    Ok(())
                }
                None => {
                    let err = format!("cancel_completion Handle not found {}", conversation_id);
                    println!("{}", err);
                    Err(err)
                }
            }
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
        interface: &Box<dyn LlmInferenceInterface + Send + Sync>
    ) -> Result<(), String> {
        let query = query.clone();
        let is_stream = query.options.get_parameter_as_boolean("stream").unwrap_or(false);
        let completion_options = completion_options.clone();
        let mut interface = interface.clone();
        let mut adapter = ProviderAdapter::new(conversation_id, interface.clone());

        let mut service = match
            interface.call_completion(&query, completion_options, &mut adapter).await
        {
            Ok(service) => service,
            Err(err) => {
                let e = app
                    .emit_all("opla-sse", Payload {
                        message: err.to_string(),
                        status: ServerStatus::Error.as_str().to_string(),
                    })
                    .map_err(|err| err.to_string());
                if e.is_err() {
                    println!("Send error: {}", e.unwrap_err());
                }
                return Err(err.to_string());
            }
        };

        let cid = format!("{}", conversation_id);
        let message_id = format!("{}", message_id);
        let completion_handles = self.completion_handles.clone();
        let handle = spawn(async move {
            let send = |response: Result<LlmCompletionResponse, LlmError>| {
                let mut finished = false;
                let result = match response {
                    Ok(response) => {
                        let mut response = response.clone();
                        if response.status == Some(String::from("finished")) {
                            finished = true;
                        }
                        response.conversation_id = Some(cid.to_string());
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
                if finished {
                    let completion_handles = completion_handles.clone();
                    let cid = cid.clone();
                    spawn(async move {
                        let mut handles = completion_handles.lock().await;
                        handles.remove(&cid.to_string());
                    });
                    println!("call completion result {:?}", result);
                }
            };
            service.run(is_stream, send).await;
        });

        let mut handles = self.completion_handles.lock().await;
        handles.insert(conversation_id.to_string(), Arc::new(handle.abort_handle()));

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
            let interface = self.create_interface(
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
                &interface.clone()
            ).await;

            // server.set_parameters(Some(parameters));

            let mut store = context.store.lock().await;
            store.set_local_active_model_id(&model);
            store.save().map_err(|err| err.to_string())?;
            // println!("Opla call completion: {:?}", response);
            return Ok(response?);
        }
        if llm_provider_type == "openai" || llm_provider_type == "server" {
            let conversation_id = query.options.conversation_id.clone();
            let message_id = query.options.message_id.clone();
            let mut response = {
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
                                    response.message_id = message_id.clone();
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
            response.conversation_id = conversation_id.clone();
            response.message_id = message_id.clone();
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
            let client = self.create_interface(
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
