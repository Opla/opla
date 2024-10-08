// Copyright 2024 Mik Bry
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
use llm::LlmCompletionPayload;
use serde::Serialize;
use tauri::{ AppHandle, Manager, Runtime };
use tokenizer::encode;
use tokio::{ spawn, sync::Mutex };
use bytes::Bytes;
use uuid::Uuid;

use crate::{
    data::{ provider::{ Provider, ProviderType }, LLMErrorPayload, Payload },
    store::server::{ ServerConfiguration, ServerStorage },
    utils::http_client::{ HttpChunk, NewHttpError },
    OplaContext,
    ServerStatus,
};

use self::{
    llama_cpp::LlamaCppInferenceClient,
    llm::{
        LlmCompletionOptions,
        LlmCompletionResponse,
        LlmError,
        LlmImageGenerationResponse,
        LlmInferenceInterface,
        LlmModelsResponse,
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

#[derive(Clone, Debug)]
pub struct ServerParameters {
    pub port: i32,
    pub host: String,
}

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

    pub fn get_opla_provider(server: &ServerStorage) -> Provider {
        let config = &server.configuration;
        Provider {
            id: Uuid::new_v4().to_string(),
            name: "Opla".to_string(),
            created_at: None,
            updated_at: None,
            r#type: ProviderType::Opla.to_string(),
            description: Some("Opla is a free and open source AI assistant.".to_string()),
            url: format!(
                "{:}:{:}",
                config.get_parameter_string("host", "127.0.0.1".to_string()),
                config.get_parameter_int("port", 8081)
            ),
            disabled: Some(false),
            key: None,
            doc_url: Some("https://opla.ai/docs".to_string()),
            metadata: Option::Some(server.configuration.parameters.clone()),
            models: None,
            errors: None,
        }
    }

    async fn bind_local_server<R: Runtime>(
        &self,
        app: AppHandle<R>,
        model: String
    ) -> Result<ServerConfiguration, String> {
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

        let mut config = server.configuration.clone();
        config.set_parameter_string("model_id", model);
        config.set_parameter_string("model_path", model_path);
        server.bind::<R>(app.app_handle(), &config).await.map_err(|err| err.to_string())?;
        Ok(config.clone())
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
        let app_handle = app.app_handle();
        let config = self.bind_local_server(app, model).await?;
        let context = app_handle.state::<OplaContext>();
        let mut store = context.store.lock().await;
        if
            !store.server.launch_at_startup ||
            config.parameters != store.server.configuration.parameters
        {
            store.server.launch_at_startup = true;
            store.server.configuration = config.clone();
            store.server.emit_update_all(app_handle.app_handle());
            store.save().map_err(|err| err.to_string())?;
        }

        let mut interface = interface.clone();
        let parameters: ServerParameters = ServerParameters {
            host: config.get_parameter_string("host", "127.0.0.1".to_string()),
            port: config.get_parameter_int("port", 8081),
        };
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
                (ProvidersManager::get_opla_provider(&server), "opla".to_string())
            }
        };
        println!("llm_cancel_completion {} {}", llm_provider_type, conversation_id);
        if llm_provider_type == "opla" {
            // self.cancel_completion(conversation_id).await
            let mut completion_handles = self.completion_handles.lock().await;
            let handle = completion_handles.remove(conversation_id);
            println!("Cancel completion {}", conversation_id);
            let _ = app
                .emit_all("opla-sse", LlmCompletionPayload {
                    response: LlmCompletionResponse::new(0, "cancel", ""),
                    conversation_id: conversation_id.to_string(),
                    message_id: message_id.to_string(),
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
                    .emit_all(
                        "opla-sse",
                        Payload::LLMError(LLMErrorPayload {
                            conversation_id: Some(conversation_id.to_string()),
                            message_id: Some(message_id.to_string()),
                            message: err.to_string(),
                            status: ServerStatus::Error.as_str().to_string(),
                        })
                    )
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
                println!("response {:?}", response);
                let result = match response {
                    Ok(response) => {
                        if response.status == String::from("finished") {
                            finished = true;
                        }
                        let payload = LlmCompletionPayload {
                            response: response.clone(),
                            conversation_id: cid.to_string(),
                            message_id: message_id.to_string(),
                        };
                        let _ = app.emit_all("opla-sse", payload).map_err(|err| err.to_string());
                        Ok(response.clone())
                    }
                    Err(err) => {
                        let _ = app
                            .emit_all(
                                "opla-sse",
                                Payload::LLMError(LLMErrorPayload {
                                    conversation_id: Some(cid.to_string()),
                                    message_id: Some(message_id.to_string()),
                                    message: err.to_string(),
                                    status: ServerStatus::Error.as_str().to_string(),
                                })
                            )
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
                (ProvidersManager::get_opla_provider(&server), "opla".to_string())
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

            let mut store = context.store.lock().await;
            store.set_local_active_model_id(&model);
            store.save().map_err(|err| err.to_string())?;
            println!("Opla call completion: {:?}", response);
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
                                    // let mut response = response.clone();
                                    let payload = LlmCompletionPayload {
                                        response,
                                        conversation_id: conversation_id.clone(),
                                        message_id: message_id.clone(),
                                    };
                                    let _ = app
                                        .emit_all("opla-sse", payload)
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
            let payload = LlmCompletionPayload {
                response,
                conversation_id: conversation_id.clone(),
                message_id: message_id.clone(),
            };
            let _ = app.emit_all("opla-sse", payload).map_err(|err| err.to_string());
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
            let client = self.create_interface(
                app.app_handle(),
                model.to_string(),
                llm_provider_type
            ).await?;
            let response = client
                .clone()
                .call_tokenize(&model, text).await
                .map_err(|err| err.to_string())?;

            return Ok(response);
        } else if llm_provider_type == "openai" {
            let encoded = match encode(text, model, None) {
                Ok(e) => { e }
                Err(err) => {
                    return Err(format!("LLM OpenAI encode error: {:?}", err));
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

    pub async fn llm_call_image_generation<R: Runtime>(
        &mut self,
        model: Option<String>,
        provider: Provider,
        prompt: String
    ) -> Result<LlmImageGenerationResponse, String> {
        let llm_provider_type = provider.r#type;
        if llm_provider_type == "openai" {
            let api = format!("{:}", provider.url);
            let secret_key = match provider.key {
                Some(k) => { k }
                None => {
                    if llm_provider_type == "openai" {
                        return Err(format!("OpenAI provider key not set: {:?}", llm_provider_type));
                    }
                    ' '.to_string()
                }
            };
            let result = openai
                ::call_image_generation(&api, &secret_key, &prompt, model).await
                .map_err(|err| err.to_string());

            return result;
        }
        return Err(
            format!("LLM provider image generation not implemented: {:?}", llm_provider_type)
        );
    }

    pub async fn llm_call_models<R: Runtime>(
        &mut self,
        provider: Provider
    ) -> Result<LlmModelsResponse, String> {
        let llm_provider_type = provider.r#type;
        if llm_provider_type == "openai" {
            let api = format!("{:}", provider.url);
            let secret_key = match provider.key {
                Some(k) => { k }
                None => {
                    if llm_provider_type == "openai" {
                        return Err(format!("OpenAI provider key not set: {:?}", llm_provider_type));
                    }
                    ' '.to_string()
                }
            };
            let result = openai
                ::call_models(&api, &secret_key).await
                .map_err(|err| err.to_string());

            return result;
        }
        return Err(format!("LLM provider models not implemented: {:?}", llm_provider_type));
    }
}
