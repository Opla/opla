// Copyright 2023 Mik Bry
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

#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod server;
mod store;
mod downloader;
mod sys;
pub mod utils;
pub mod api;
pub mod data;
pub mod llm;
pub mod error;

use tokenizer::encode;
use tokio::sync::Mutex;
use std::sync::Arc;

use api::{
    assistants::{ fetch_assistants_collection, AssistantsCollection },
    hf::search_hf_models,
    models,
};
use data::model::Model;
use downloader::Downloader;
use llm::{
    openai::call_completion,
    LlmCompletionOptions,
    LlmCompletionResponse,
    LlmError,
    LlmQuery,
    LlmQueryCompletion,
    LlmTokenizeResponse,
};
use models::{ fetch_models_collection, ModelsCollection };
use serde::Serialize;
use store::{ Store, Provider, ProviderType, ProviderMetadata, Settings, ServerConfiguration };
use server::*;
use sys::Sys;
use tauri::{ Runtime, State, Manager, App, EventLoopMessage };
use utils::{ get_config_directory, get_data_directory };

pub struct OplaContext {
    pub server: Arc<Mutex<OplaServer>>,
    pub store: Mutex<Store>,
    pub downloader: Mutex<Downloader>,
    pub sys: Mutex<Sys>,
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

#[tauri::command]
async fn get_sys<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Sys, String> {
    let mut sys: Sys = context.sys.lock().await.clone();
    sys.refresh();
    Ok(sys)
}

#[tauri::command]
async fn get_opla_configuration<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Store, String> {
    let store = context.store.lock().await;
    Ok(store.clone())
}

#[tauri::command]
async fn save_settings<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    settings: Settings
) -> Result<Store, String> {
    let mut store = context.store.lock().await;
    store.settings = settings;
    // println!("Save settings: {:?}", store.settings);
    store.save().map_err(|err| err.to_string())?;
    Ok(store.clone())
}

#[tauri::command]
async fn get_config_dir<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>
) -> Result<String, String> {
    let config_dir = get_config_directory()?;
    let config_dir = match config_dir.to_str() {
        Some(c) => { c }
        None => {
            return Err(format!("Failed to get config directory"));
        }
    };
    println!("Config dir: {:?}", config_dir);
    Ok(config_dir.to_string())
}

#[tauri::command]
async fn get_data_dir<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>
) -> Result<String, String> {
    let data_dir = get_data_directory()?;
    let data_dir = match data_dir.to_str() {
        Some(d) => { d }
        None => {
            return Err(format!("Failed to get data directory"));
        }
    };
    // println!("Data dir: {:?}", data_dir);
    Ok(data_dir.to_string())
}

#[tauri::command]
async fn create_dir<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    path: String,
    data_dir: String
) -> Result<(), String> {
    let dir = std::path::Path::new(data_dir.as_str()).join(path);
    if dir.exists() {
        return Ok(());
    } else {
        println!("Create dir: {:?}", dir);
        std::fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn get_provider_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Provider, String> {
    let store = context.store.lock().await;
    let server = store.server.clone();
    let template = get_opla_provider(server);
    Ok(template.clone())
}

#[tauri::command]
async fn get_opla_server_status<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Payload, String> {
    let server = context.server.lock().await;
    server.get_status()
}

#[tauri::command]
async fn start_opla_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Option<String>,
    port: i32,
    host: String,
    context_size: i32,
    threads: i32,
    n_gpu_layers: i32
) -> Result<Payload, String> {
    println!("Opla try to start ");
    let mut store = context.store.lock().await;
    let model_name = match model {
        Some(m) => { m }
        None => {
            match &store.get_local_active_model_id() {
                Some(m) => { m.clone() }
                None => {
                    println!("Opla server not started default model not set");
                    return Err(format!("Opla server not started model not set"));
                }
            }
        }
    };

    let res = store.models.get_model_path(model_name.clone());
    let model_path = match res {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Opla server not started model not found: {:?}", err));
        }
    };
    // store.models.active_model = Some(model_name.clone());
    store.server.parameters.port = port;
    store.server.parameters.host = host.clone();
    store.server.parameters.model = Some(model_path.clone());
    store.server.parameters.context_size = context_size;
    store.server.parameters.threads = threads;
    store.server.parameters.n_gpu_layers = n_gpu_layers;
    store.save().map_err(|err| err.to_string())?;

    // let args = store.server.parameters.to_args(model_path.as_str());
    let parameters = store.server.parameters.clone();
    let mut server = context.server.lock().await;
    server.start(app, &model_name, &model_path, Some(&parameters)).await
}

#[tauri::command]
async fn stop_opla_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Payload, String> {
    let mut server = context.server.lock().await;
    server.stop(&app).await
}
#[tauri::command]
async fn get_assistants_collection<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    _context: State<'_, OplaContext>
) -> Result<AssistantsCollection, String>
    where Result<AssistantsCollection, String>: Serialize
{
    fetch_assistants_collection("https://opla.github.io/assistants/all.json").await.map_err(|err|
        err.to_string()
    )
}

#[tauri::command]
async fn get_models_collection<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    _context: State<'_, OplaContext>
) -> Result<ModelsCollection, String>
    where Result<ModelsCollection, String>: Serialize
{
    fetch_models_collection("https://opla.github.io/models/all.json").await.map_err(|err|
        err.to_string()
    )
}

#[tauri::command]
async fn search_hfhub_models<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    _context: State<'_, OplaContext>,
    query: String
) -> Result<ModelsCollection, String>
    where Result<ModelsCollection, String>: Serialize
{
    search_hf_models(&query).await.map_err(|err| {
        println!("Search HF models error: {:?}", err);
        err.to_string()
    })
}

#[tauri::command]
async fn get_model_full_path<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    filename: String
) -> Result<String, String>
    where Result<ModelsCollection, String>: Serialize
{
    let store = context.store.lock().await;
    let error = format!("Model path not valid: {:?}", filename.clone());
    let result = store.models.get_path(filename);
    let path = match result {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Model path not found: {:?}", err));
        }
    };
    match path.to_str() {
        Some(str) => {
            return Ok(str.to_string());
        }
        None => {
            return Err(error);
        }
    }
}

#[tauri::command]
async fn install_model<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Model,
    url: Option<String>,
    path: String,
    file_name: String
) -> Result<String, String> {
    let mut store = context.store.lock().await;
    let was_empty = store.models.items.is_empty();
    let model_name = model.name.clone();
    let (mut model_entity, model_id) = store.models.create_model(
        model,
        None,
        Some(path.clone()),
        Some(file_name.clone())
    );
    // let model_id = store.models.add_model(model, None, Some(path.clone()), Some(file_name.clone()));
    let res = store.models.create_model_path_filename(path, file_name.clone());
    let model_path = match res {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Install model error: {:?}", err));
        }
    };
    if was_empty {
        store.set_local_active_model_id(&model_name);
    }

    match url {
        Some(u) => {
            model_entity.state = Some("downloading".to_string());
            store.models.add_model(model_entity);
            store.save().map_err(|err| err.to_string())?;
            drop(store);
            let mut downloader = context.downloader.lock().await;
            downloader.download_file(model_id.clone(), u, model_path, file_name.as_str(), app);
        }
        None => {
            model_entity.state = Some("ok".to_string());
            store.models.add_model(model_entity);
            store.save().map_err(|err| err.to_string())?;
            drop(store);
            if was_empty && url.is_none() {
                let res = start_server(app, context).await;
                match res {
                    Ok(_) => {}
                    Err(err) => {
                        return Err(format!("Install model error: {:?}", err));
                    }
                }
            }
        }
    }

    Ok(model_id.clone())
}

#[tauri::command]
async fn cancel_download_model<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_name_or_id: String
) -> Result<(), String> {
    let mut store = context.store.lock().await;

    let mut downloader = context.downloader.lock().await;
    downloader.cancel_download(&model_name_or_id, &app);

    let model = store.models.get_model(model_name_or_id.as_str());
    match model {
        Some(m) => {
            store.models.remove_model(model_name_or_id.as_str());

            /* if store.get_local_active_model_id() == Some(model_name_or_id.clone()) {
                store.services.active_service = None;
            } */
            store.clear_active_service_if_model_equal(model_name_or_id.as_str());
            store.save().map_err(|err| err.to_string())?;
            drop(store);

            let mut server = context.server.lock().await;
            if m.is_some_id_or_name(&server.model) {
                let _res = server.stop(&app).await;
            }
        }
        None => {
            return Err(format!("Model not found: {:?}", model_name_or_id));
        }
    }

    Ok(())
}

#[tauri::command]
async fn update_model<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Model
) -> Result<(), String> {
    let mut store = context.store.lock().await;

    store.models.update_model(model);

    store.save().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
async fn uninstall_model<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_id: String
) -> Result<(), String> {
    let mut store = context.store.lock().await;

    match store.models.remove_model(model_id.as_str()) {
        Some(model) => {
            /* if store.models.active_model == Some(model.name.clone()) {
                store.models.active_model = None;
            } */
            store.clear_active_service_if_model_equal(model.name.as_str());
            let mut server = context.server.lock().await;
            if model.is_some_id_or_name(&server.model) {
                let _res = server.stop(&app).await;
                server.remove_model();
            }
        }
        None => {
            return Err(format!("Model not found: {:?}", model_id));
        }
    }

    store.save().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
async fn set_active_model<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_id: String,
    provider: Option<String>
) -> Result<(), String> {
    let mut store = context.store.lock().await;
    let result = store.models.get_model(model_id.as_str());
    if result.is_none() && (provider.is_none() || provider.as_deref() == Some("Opla")) {
        return Err(format!("Model not found: {:?}", model_id));
    } else if provider.is_some() {
        store.set_active_service(&model_id, &provider.unwrap_or("Opla".to_string()));
    } else {
        store.set_local_active_model_id(&model_id);
    }
    store.save().map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
async fn llm_call_completion<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: String,
    llm_provider: Option<Provider>,
    query: LlmQuery<LlmQueryCompletion>,
    completion_options: Option<LlmCompletionOptions>
) -> Result<LlmCompletionResponse, String> {
    let (llm_provider, llm_provider_type) = match llm_provider {
        Some(p) => { (p.clone(), p.r#type) }
        None => {
            let store = context.store.lock().await;
            let server = store.server.clone();
            (get_opla_provider(server), "opla".to_string())
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
        let query = query.clone();
        let conversation_id = query.options.conversation_id.clone();
        server
            .bind::<R>(app.app_handle(), &model_name, &model_path).await
            .map_err(|err| err.to_string())?;
        let handle = app.app_handle();
        let response = {
            server
                .call_completion::<R>(
                    &model_name,
                    query,
                    completion_options,
                    Some(|result: Result<LlmCompletionResponse, LlmError>| {
                        match result {
                            Ok(response) => {
                                let mut response = response.clone();
                                response.conversation_id = conversation_id.clone();
                                let _ = handle
                                    .emit_all("opla-sse", response)
                                    .map_err(|err| err.to_string());
                            }
                            Err(err) => {
                                let _ = handle
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
        let parameters = server.parameters.clone();
        server.set_parameters(&model, &model_path, parameters);

        let mut store = context.store.lock().await;
        store.set_local_active_model_id(&model);
        store.save().map_err(|err| err.to_string())?;
        // println!("Opla call completion: {:?}", response);
        return Ok(response);
    }
    if llm_provider_type == "openai" || llm_provider_type == "server" {
        let response = {
            let api = format!("{:}", llm_provider.url);
            let secret_key = match llm_provider.key {
                Some(k) => { k }
                None => {
                    if llm_provider_type == "openai" {
                        return Err(format!("OpenAI provider key not set: {:?}", llm_provider_type));
                    }
                    ' '.to_string()
                }
            };
            let model = model.clone();
            let query = query.clone();
            let conversation_id = query.options.conversation_id.clone();
            call_completion::<R>(
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
            ).await.map_err(|err| err.to_string())?
        };
        return Ok(response);
    }
    return Err(format!("LLM provider not found: {:?}", llm_provider_type));
}

#[tauri::command]
async fn llm_call_tokenize<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: String,
    provider: Provider,
    text: String
) -> Result<LlmTokenizeResponse, String> {
    let llm_provider_type = provider.r#type;
    if llm_provider_type == "opla" {
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
async fn start_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    context: State<'_, OplaContext>
) -> Result<(), String> {
    println!("Opla try to start server");
    let mut store = context.store.lock().await;

    let local_active_model_id = store.get_local_active_model_id();
    let active_model = match local_active_model_id {
        Some(m) => { m }
        None => {
            return Err(format!("Opla server not started default model not set"));
        }
    };
    let model_path = match store.models.get_model_path(active_model.clone()) {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Opla server not started model path not found: {:?}", err));
        }
    };
    // let args = store.server.parameters.to_args(model_path.as_str());
    let mut parameters = store.server.parameters.clone();
    let mut server = context.server.lock().await;
    let response = server.start(app, &active_model, &model_path, Some(&parameters)).await;
    if response.is_err() {
        return Err(format!("Opla server not started: {:?}", response));
    }
    parameters.model = Some(model_path.clone());
    store.server.parameters = parameters;
    store.save().map_err(|err| err.to_string())?;
    println!("Opla server started: {:?}", response);
    Ok(())
}

async fn model_download<R: Runtime>(
    app: tauri::AppHandle<R>,
    model_id: String,
    state: String
) -> Result<(), String> {
    let handle = app.app_handle();
    let context = app.state::<OplaContext>();
    let mut store = context.store.lock().await;
    let model = store.models.get_model_entity(model_id.as_str());
    match model {
        Some(mut m) => {
            m.state = Some(state.clone());
            store.models.update_model_entity(&m);
            store.save().map_err(|err| err.to_string())?;
            drop(store);
            println!("model_download {} {}", state, model_id);
            let server = context.server.lock().await;
            if
                state == "ok" &&
                (m.reference.is_some_id_or_name(&server.model) || server.model.is_none())
            {
                drop(server);
                let res = start_server(handle, context).await;
                match res {
                    Ok(_) => {}
                    Err(err) => {
                        return Err(format!("Model download start server error: {:?}", err));
                    }
                }
            }
        }
        None => {
            return Err(format!("Model not found: {:?}", model_id));
        }
    }
    Ok(())
}

async fn window_setup<EventLoopMessage>(app: &mut App) -> Result<(), String> {
    let context = app.state::<OplaContext>();
    let window = app.get_window("main").ok_or("Opla failed to get window")?;
    let store = context.store.lock().await;
    // TODO fix window size
    // Instead used https://github.com/tauri-apps/tauri-plugin-window-state
    // but not optimal...
    match &store.settings.window {
        Some(w) => {
            window.set_fullscreen(w.fullscreen).map_err(|err| err.to_string())?;
            println!("Window size: {:?}", w);
            /* window
                .set_size(Size::Physical(PhysicalSize { width: w.width, height: w.height }))
                .map_err(|err| err.to_string())?; */
        }
        None => {}
    }

    /* let window_clone = Arc::new(Mutex::new(window.clone()));
    window.clone().on_window_event(move |event| {
        if let WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed { .. } = event {
            println!("Window closed");
            let win = match window_clone.lock() {
                Ok(w) => { w }
                Err(err) => {
                    println!("{}", err.to_string());
                    return;
                }
            };
            let app = win.app_handle();
            let context = app.state::<OplaContext>(); // Use app_arc instead of app
            let mut store = match context.store.lock() {
                Ok(s) => { s }
                Err(err) => {
                    println!("{}", err.to_string());
                    return;
                }
            };
            let size = win.inner_size().unwrap_or(PhysicalSize { width: 800, height: 600 });
            store.settings.window = Some(WindowSettings {
                fullscreen: window.is_fullscreen().unwrap_or(false),
                width: size.width,
                height: size.height,
            });
            match store.save() {
                Ok(_) => {}
                Err(err) => {
                    println!("{}", err.to_string());
                    return;
                }
            }
        }
    });*/
    Ok(())
}

fn handle_download_event<EventLoopMessage>(app: &tauri::AppHandle, payload: &str) {
    let vec: Vec<&str> = payload.split(':').collect();
    let (state, id) = (vec[0].to_string(), vec[1].to_string());

    let handler = app.app_handle();
    tauri::async_runtime::spawn(async move {
        let handler = handler.app_handle();
        match model_download(handler, id.to_string(), state.to_string()).await {
            Ok(_) => {}
            Err(err) => {
                println!("Model downloaded error: {:?}", err);
            }
        }
    });
}

async fn opla_setup(app: &mut App) -> Result<(), String> {
    println!("Opla setup: ");
    let context = app.state::<OplaContext>();
    let mut store = context.store.lock().await;
    let resource_path = app.path_resolver().resolve_resource("assets");
    let resource_path = match resource_path {
        Some(r) => { r }
        None => {
            return Err(format!("Opla failed to resolve resource path: {:?}", resource_path));
        }
    };
    store.load(resource_path).map_err(|err| err.to_string())?;

    app
        .emit_all("opla-server", Payload {
            message: "Init Opla backend".into(),
            status: ServerStatus::Init.as_str().to_string(),
        })
        .map_err(|err| err.to_string())?;
    let mut server = context.server.lock().await;
    server.init(store.server.clone());
    let launch_at_startup = store.server.launch_at_startup;
    let active_model = String::from("");
    let local_model_id = store.get_local_active_model_id();
    let (has_model, active_model) = match local_model_id {
        Some(m) => { (store.has_model(m.as_str()), m) }
        None => { (false, active_model) }
    };
    if !has_model && active_model != "" {
        println!("Opla server model not found: {:?}", active_model);
        // Remove default model from server
        server.remove_model();
        //store.models.active_model = None;
        store.services.active_service = None;
        store.save().map_err(|err| err.to_string())?;
    }
    drop(store);
    if launch_at_startup && has_model {
        drop(server);
        app
            .emit_all("opla-server", Payload {
                message: "Opla server is waiting to start".into(),
                status: ServerStatus::Wait.as_str().to_string(),
            })
            .map_err(|err| err.to_string())?;
        let res = start_server(app.app_handle(), app.state::<OplaContext>()).await;
        match res {
            Ok(_) => {}
            Err(err) => {
                let mut server = context.server.lock().await;
                server.set_status(ServerStatus::Error).map(|_| "Failed to set server status")?;
                app
                    .emit_all("opla-server", Payload {
                        message: err.clone(),
                        status: ServerStatus::Error.as_str().to_string(),
                    })
                    .map_err(|err| err.to_string())?;
            }
        }
    } else {
        server.set_status(ServerStatus::Stopped).map(|_| "Failed to set server status")?;
        app
            .emit_all("opla-server", Payload {
                message: "Not started Opla backend".into(),
                status: ServerStatus::Stopped.as_str().to_string(),
            })
            .map_err(|err| err.to_string())?;
    }

    Ok(())
}

fn main() {
    let context: OplaContext = OplaContext {
        server: Arc::new(Mutex::new(OplaServer::new())),
        store: Mutex::new(Store::new()),
        downloader: Mutex::new(Downloader::new()),
        sys: Mutex::new(Sys::new()),
    };
    tauri::Builder
        ::default()
        .manage(context)
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(move |app| {
            // only include this code on debug builds
            #[cfg(debug_assertions)]
            {
                match app.get_window("main") {
                    Some(window) => {
                        window.open_devtools();
                    }
                    None => {
                        return Err("Opla failed to get window".into());
                    }
                }
            }

            let mut error: Option<String> = None;
            tauri::async_runtime::block_on(async {
                match opla_setup(app).await {
                    Ok(_) => {}
                    Err(err) => {
                        println!("Opla setup error: {:?}", err);
                        error = Some(err);
                    }
                }

                if error.is_none() {
                    match window_setup::<EventLoopMessage>(app).await {
                        Ok(_) => {}
                        Err(err) => {
                            println!("Window setup error: {:?}", err);
                            error = Some(err);
                        }
                    }
                }
            });

            if !error.is_some() {
                println!("Opla setup done");
                let handle = app.handle();
                let _id = app.listen_global("opla-downloader", move |event| {
                    let payload = match event.payload() {
                        Some(p) => { p }
                        None => {
                            return;
                        }
                    };
                    handle_download_event::<EventLoopMessage>(&handle, payload);
                });
            }

            match error {
                Some(err) => { Err(err.into()) }
                None => { Ok(()) }
            }
        })
        .invoke_handler(
            tauri::generate_handler![
                get_sys,
                get_opla_configuration,
                save_settings,
                get_config_dir,
                get_data_dir,
                create_dir,
                get_provider_template,
                get_opla_server_status,
                start_opla_server,
                stop_opla_server,
                get_models_collection,
                search_hfhub_models,
                get_model_full_path,
                install_model,
                cancel_download_model,
                uninstall_model,
                update_model,
                set_active_model,
                get_assistants_collection,
                llm_call_completion,
                llm_call_tokenize
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
