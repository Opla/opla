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
pub mod utils;
pub mod api;
pub mod data;
pub mod llm;
pub mod error;

use std::sync::Mutex;

use api::models;
use data::model::Model;
use downloader::Downloader;
use llm::{ LlmQuery, LlmResponse, LlmQueryCompletion };
use models::{ fetch_models_collection, ModelsCollection };
use serde::Serialize;
use store::{ Store, ProviderConfiguration, ProviderType, ProviderMetadata };
use server::*;
use tauri::{ Runtime, State, Manager, App };

pub struct OplaContext {
    pub server: Mutex<OplaServer>,
    pub store: Mutex<Store>,
    pub downloader: Mutex<Downloader>,
}

#[tauri::command]
async fn get_opla_configuration<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Store, String> {
    let store = context.store.lock().map_err(|err| err.to_string())?;
    Ok(store.clone())
}

#[tauri::command]
async fn get_provider_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<ProviderConfiguration, String> {
    let store = context.store.lock().map_err(|err| err.to_string())?;
    let server = store.server.clone();
    let template = ProviderConfiguration {
        name: "Opla".to_string(),
        r#type: ProviderType::Opla.to_string(),
        description: "Opla is a free and open source AI assistant.".to_string(),
        url: server.parameters.host.clone(),
        disabled: false,
        doc_url: Some("https://opla.ai/docs".to_string()),
        metadata: ProviderMetadata {
            server: server.clone(),
        },
    };
    Ok(template.clone())
}

#[tauri::command]
async fn get_opla_server_status<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Payload, String> {
    let server = context.server.lock().map_err(|err| err.to_string())?;
    server.get_status()
}

#[tauri::command]
async fn start_opla_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: String,
    port: i32,
    host: String,
    context_size: i32,
    threads: i32,
    n_gpu_layers: i32
) -> Result<Payload, String> {
    println!("Opla try to start ");
    let mut store = context.store.lock().map_err(|err| err.to_string())?;
    let model_name = model;

    let res = store.models.get_model_path(model_name.clone());
    let model_path = match res {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Opla server not started model not found: {:?}", err));
        }
    };
    store.models.default_model = Some(model_name.clone());
    store.server.parameters.port = port;
    store.server.parameters.host = host.clone();
    store.server.parameters.context_size = context_size;
    store.server.parameters.threads = threads;
    store.server.parameters.n_gpu_layers = n_gpu_layers;
    store.save().map_err(|err| err.to_string())?;

    let args = store.server.parameters.to_args(model_path.as_str());
    let mut server = context.server.lock().map_err(|err| err.to_string())?;
    server.start(app, model_name, args)
}

#[tauri::command]
async fn stop_opla_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Payload, String> {
    let mut server = context.server.lock().map_err(|err| err.to_string())?;
    server.stop(app)
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
async fn install_model<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Model,
    url: String,
    path: String,
    file_name: String
) -> Result<String, String> {
    let mut store = context.store.lock().map_err(|err| err.to_string())?;

    let model_id = store.models.add_model(model, None, Some(path.clone()), Some(file_name.clone()));
    let res = store.models.create_model_path_filename(path, file_name.clone());
    let model_path = match res {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Install model error: {:?}", err));
        }
    };
    let downloader = context.downloader.lock().map_err(|err| err.to_string())?;
    downloader.download_file(model_id.clone(), url, model_path, file_name.as_str(), app);

    store.save().map_err(|err| err.to_string())?;

    Ok(model_id.clone())
}

#[tauri::command]
async fn uninstall_model<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_id: String
) -> Result<(), String> {
    let mut store = context.store.lock().map_err(|err| err.to_string())?;

    store.models.remove_model(model_id.as_str());

    store.save().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
async fn set_active_model<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_id: String
) -> Result<(), String> {
    let mut store = context.store.lock().map_err(|err| err.to_string())?;
    let result = store.models.get_model(model_id.as_str());
    if result.is_none() {
        return Err(format!("Model not found: {:?}", model_id));
    }
    store.models.default_model = Some(model_id);
    store.save().map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
async fn llm_call_completion<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: String,
    llm_provider: String,
    query: LlmQuery<LlmQueryCompletion>
) -> Result<LlmResponse, String> {
    if llm_provider == "opla" {
        let model_name = {
            let store = context.store.lock().map_err(|err| err.to_string())?;
            let result = store.models.get_model(model.as_str());
            let model = match result {
                Some(model) => model.clone(),
                None => {
                    return Err(format!("Model not found: {:?}", model));
                }
            };
            drop(store);
            model.name
        };
        let response = {
            let mut server = context.server
                .lock()
                .map_err(|err| err.to_string())?
                .clone();
            server.call_completion(model_name, query).await
        };

        return response.map_err(|err| err.to_string());
    }
    return Err(format!("LLM provider not found: {:?}", llm_provider));
}

fn start_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    context: State<'_, OplaContext>
) -> Result<(), String> {
    println!("Opla try to start server");
    let res = context.store.lock();
    let store = match res {
        Ok(s) => { s }
        Err(err) => {
            return Err(format!("Opla server not started store not found: {:?}", err));
        }
    };
    let default_model = match &store.models.default_model {
        Some(m) => { m }
        None => {
            return Err(format!("Opla server not started default model not set"));
        }
    };
    let model_path = match store.models.get_model_path(default_model.clone()) {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Opla server not started model path not found: {:?}", err));
        }
    };
    let args = store.server.parameters.to_args(model_path.as_str());
    let mut server = context.server.lock().map_err(|err| err.to_string())?;
    let response = server.start(app, default_model.to_string(), args);
    if response.is_err() {
        return Err(format!("Opla server not started: {:?}", response));
    }
    println!("Opla server started: {:?}", response);
    Ok(())
}

fn opla_setup(app: &mut App) -> Result<(), String> {
    println!("Opla setup: ");
    let context = app.state::<OplaContext>();
    let mut store = context.store.lock().map_err(|err| err.to_string())?;
    let resource_path = app.path_resolver().resolve_resource("assets");
    let resource_path = match resource_path {
        Some(r) => { r }
        None => {
            return Err(format!("Opla failed to resolve resource path: {:?}", resource_path));
        }
    };
    store.load(resource_path).map_err(|err| err.to_string())?;
    // println!("Opla config: {:?}", config);
    let launch_at_startup = store.server.launch_at_startup;
    let has_model = store.models.default_model.is_some();
    let default_model = store.models.default_model.clone();
    drop(store);
    app
        .emit_all("opla-server", Payload {
            message: "Init Opla backend".into(),
            status: ServerStatus::Init.as_str().to_string(),
        })
        .map_err(|err| err.to_string())?;
    let mut server = context.server.lock().map_err(|err| err.to_string())?;
    server.init();
    if launch_at_startup && has_model {
        drop(server);
        app
            .emit_all("opla-server", Payload {
                message: "Opla server is waiting to start".into(),
                status: ServerStatus::Wait.as_str().to_string(),
            })
            .map_err(|err| err.to_string())?;
        let res = start_server(app.app_handle(), app.state::<OplaContext>());
        match res {
            Ok(_) => {}
            Err(err) => {
                let mut server = context.server.lock().map_err(|err| err.to_string())?;
                server.set_status(ServerStatus::Error).map(|_| "Failed to set server status")?;
                app
                    .emit_all("opla-server", Payload {
                        message: err.clone(),
                        status: ServerStatus::Error.as_str().to_string(),
                    })
                    .map_err(|err| err.to_string())?;
                return Err(err.into());
            }
        }
    } else {
        println!("Opla server not started model: {:?}", default_model);
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
        server: Mutex::new(OplaServer::new()),
        store: Mutex::new(Store::new()),
        downloader: Mutex::new(Downloader::new()),
    };
    tauri::Builder
        ::default()
        .manage(context)
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

            match opla_setup(app) {
                Ok(_) => {}
                Err(err) => {
                    println!("Opla setup error: {:?}", err);
                    return Err(err.into());
                }
            }
            Ok(())
        })
        .invoke_handler(
            tauri::generate_handler![
                get_opla_configuration,
                get_provider_template,
                get_opla_server_status,
                start_opla_server,
                stop_opla_server,
                get_models_collection,
                install_model,
                uninstall_model,
                set_active_model,
                llm_call_completion
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
