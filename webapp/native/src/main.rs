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

use std::sync::Mutex;

use api::models;
use data::model::Model;
use downloader::Downloader;
use models::{ fetch_models_collection, ModelsCollection };
use serde::Serialize;
use store::{ Store, ProviderConfiguration, ProviderType, ProviderMetadata };
use server::*;
use tauri::{ Runtime, State, Manager };

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
    let store = context.store.lock().unwrap();
    Ok(store.clone())
}

#[tauri::command]
async fn get_provider_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<ProviderConfiguration, String> {
    let store = context.store.lock().unwrap();
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
    context.server.lock().unwrap().get_status()
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
    let mut store = context.store.lock().unwrap();
    let model_name = model;
    let models = &store.models;
    let model = models.items
        .iter()
        .find(|m| m.reference.name == model_name)
        .unwrap()
        .clone();
    let model_path = models.get_model_path(
        model.path.clone().unwrap(),
        model.file_name.clone().unwrap()
    );

    store.models.default_model = Some(model_name);
    store.server.parameters.port = port;
    store.server.parameters.host = host.clone();
    store.server.parameters.context_size = context_size;
    store.server.parameters.threads = threads;
    store.server.parameters.n_gpu_layers = n_gpu_layers;
    store.save().expect("Failed to save config");

    let response = context.server
        .lock()
        .unwrap()
        .start(app, [
            "-m",
            model_path.as_str(),
            "--port",
            &port.to_string(),
            "--host",
            host.as_str(),
            "-c",
            &context_size.to_string(),
            "-t",
            &threads.to_string(),
            "-ngl",
            &n_gpu_layers.to_string(),
        ]);

    response
}

#[tauri::command]
async fn stop_opla_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Payload, String> {
    context.server.lock().unwrap().stop(app)
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
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Model,
    url: String,
    path: String,
    file_name: String
) -> Result<String, String> {
    let mut store = context.store.lock().expect("Failed to get config");

    let model_id = store.models.add_model(model, None, Some(path), Some(file_name));
    // let downloader = context.downloader.lock().unwrap();
    // downloader.download_file(model_id, url, file_name, app);

    store.save().expect("Failed to save config");

    Ok(model_id.clone())
}

#[tauri::command]
async fn uninstall_model<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_id: String
) -> Result<(), String> {
    let mut store = context.store.lock().expect("Failed to get config");

    store.models.remove_model(model_id.as_str());

    store.save().expect("Failed to save config");

    Ok(())
}

fn start_server<R: Runtime>(app: tauri::AppHandle<R>, context: State<'_, OplaContext>) {
    println!("Opla try to start server");
    let store = context.store.lock().expect("Failed to get config");
    let port = store.server.parameters.port;
    let host = store.server.parameters.host.clone();
    let context_size = store.server.parameters.context_size;
    let threads = store.server.parameters.threads;
    let n_gpu_layers = store.server.parameters.n_gpu_layers;
    let default_model = store.models.default_model.clone();
    if default_model.is_none() {
        println!("Opla server not started default model not set: {:?}", default_model);
        return;
    }
    let default_model = default_model.unwrap();
    let model = store.models.items.iter().find(|m| m.reference.name == default_model);
    if model.is_none() {
        println!("Opla server not started model not found: {:?}", default_model);
        return;
    }
    let model = model.unwrap();
    let model_path = store.models.get_model_path(
        model.path.clone().unwrap(),
        model.file_name.clone().unwrap()
    );

    let response = context.server
        .lock()
        .unwrap()
        .start(app, [
            "-m",
            model_path.as_str(),
            "--port",
            &port.to_string(),
            "--host",
            host.as_str(),
            "-c",
            &context_size.to_string(),
            "-t",
            &threads.to_string(),
            "-ngl",
            &n_gpu_layers.to_string(),
        ]);

    println!("Opla server started: {:?}", response);
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
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            println!("Opla setup: ");
            let context = app.state::<OplaContext>();
            let mut store = context.store.lock().unwrap();
            let resource_path = app
                .path_resolver()
                .resolve_resource("assets")
                .expect("failed to resolve resource");
            store.load(resource_path).expect("Opla failed to load config");
            // println!("Opla config: {:?}", config);
            let launch_at_startup = store.server.launch_at_startup;
            let has_model = store.models.default_model.is_some();
            let default_model = store.models.default_model.clone();
            drop(store);
            app.emit_all("opla-server", Payload {
                message: "Init Opla backend".into(),
                status: ServerStatus::Init.as_str().to_string(),
            }).unwrap();
            let mut server = context.server.lock().unwrap();
            server.init();
            if launch_at_startup && has_model {
                drop(server);
                app.emit_all("opla-server", Payload {
                    message: "Opla server is waiting to start".into(),
                    status: ServerStatus::Wait.as_str().to_string(),
                }).unwrap();
                start_server(app.app_handle(), app.state::<OplaContext>());
            } else {
                println!("Opla server not started model: {:?}", default_model);
                server.set_status(ServerStatus::Stopped).expect("Failed to set server status");
                app.emit_all("opla-server", Payload {
                    message: "Not started Opla backend".into(),
                    status: ServerStatus::Stopped.as_str().to_string(),
                }).unwrap();
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
                uninstall_model
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
