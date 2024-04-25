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

use std::sync::Arc;

use tauri::{ Manager, Runtime };
use tokenizer::encode;

use crate::{
    store::{ Provider, ProviderMetadata, ProviderType, ServerConfiguration },
    OplaContext,
    Payload,
    ServerStatus,
};

use self::llm::{
    LlmCompletionOptions,
    LlmCompletionResponse,
    LlmError,
    LlmQuery,
    LlmQueryCompletion,
    LlmTokenizeResponse,
};

pub mod openai;
pub mod llama_cpp;
pub mod llm;

pub struct ProvidersManager {}

impl ProvidersManager {
    pub fn new() -> Self {
        ProvidersManager {}
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
        if llm_provider_type == "opla" {
            let context_server = Arc::clone(&context.server);
            let mut server = context_server.lock().await;
            server.cancel_completion(conversation_id).await
        } else {
            println!("TODO");
            return Err(String::from("Not implemented"));
        }
    }

    pub async fn llm_call_completion<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        model: String,
        llm_provider: Option<Provider>,
        query: LlmQuery<LlmQueryCompletion>,
        completion_options: Option<LlmCompletionOptions>
    ) -> Result<LlmCompletionResponse, String> {
        let context = app.state::<OplaContext>();
        let (llm_provider, llm_provider_type) = match llm_provider {
            Some(p) => { (p.clone(), p.r#type) }
            None => {
                let store = context.store.lock().await;
                let server = store.server.clone();
                (ProvidersManager::get_opla_provider(server), "opla".to_string())
            }
        };
        if llm_provider_type == "opla" {
            let context_server = Arc::clone(&context.server);

            let (model_name, model_path) = {
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

                (model.name, model_path)
            };
            let mut server = context_server.lock().await;
            let handle = app.app_handle();
            let response = server.call_completion::<R>(
                handle,
                model_name.clone(),
                model_path,
                query,
                completion_options
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
                let model = model.clone();
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
                                        .emit_all("opla-sse", Payload {
                                            message: err.to_string(),
                                            status: ServerStatus::Error.as_str().to_string(),
                                        })
                                        .map_err(|err| err.to_string());
                                }
                            }
                        })
                    ).await
                    .map_err(|err| err.to_string())?
            };
            return Ok(response);
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
            let context = app.state::<OplaContext>();
            let context_server = Arc::clone(&context.server);
            let mut server = context_server.lock().await;
            let response = server
                .call_tokenize::<R>(&model, text).await
                .map_err(|err| err.to_string())?;
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
