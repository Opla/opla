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
pub mod utils;

use std::sync::Mutex;

use store::Store;
use server::*;
use tauri::{ Runtime, State, Manager };

pub struct OplaContext {
    pub server: Mutex<OplaServer>,
    pub config: Mutex<Store>,
}

#[tauri::command]
async fn get_opla_config<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Store, String> {
    let config = context.config.lock().unwrap();
    Ok(config.clone())
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
    let mut config = context.config.lock().unwrap();
    let model_config = config.models.items
        .iter()
        .find(|m| m.name == model)
        .unwrap();
    let home_dir = utils::Utils::get_home_directory().expect("Failed to get home directory");
    let models_path = home_dir.join(&config.models.path);
    let model_path = models_path.join(&model_config.path).join(&model_config.file_name);

    config.models.default_model = model.clone();
    config.server.parameters.port = port;
    config.server.parameters.host = host.clone();
    config.server.parameters.context_size = context_size;
    config.server.parameters.threads = threads;
    config.server.parameters.n_gpu_layers = n_gpu_layers;
    config.save().expect("Failed to save config");

    let response = context.server
        .lock()
        .unwrap()
        .start(app, [
            "-m",
            model_path.to_str().unwrap(),
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

fn start_server<R: Runtime>(app: tauri::AppHandle<R>, context: State<'_, OplaContext>) {
    println!("Opla try to start server");
    let config = context.config.lock().expect("Failed to get config");
    let port = config.server.parameters.port;
    let host = config.server.parameters.host.clone();
    let context_size = config.server.parameters.context_size;
    let threads = config.server.parameters.threads;
    let n_gpu_layers = config.server.parameters.n_gpu_layers;
    let default_model = config.models.default_model.clone();
    let model = config.models.items
        .iter()
        .find(|m| m.name == default_model)
        .unwrap();
    let home_dir = utils::Utils::get_home_directory().expect("Failed to get home directory");
    let models_path = home_dir.join(&config.models.path);
    let model_path = models_path.join(&model.path).join(&model.file_name);
    let response = context.server
        .lock()
        .unwrap()
        .start(app, [
            "-m",
            model_path.to_str().unwrap(),
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
        config: Mutex::new(Store::new()),
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
            let mut config = context.config.lock().unwrap();
            let resource_path = app
                .path_resolver()
                .resolve_resource("assets")
                .expect("failed to resolve resource");
            config.load(resource_path).expect("Opla failed to load config");
            // println!("Opla config: {:?}", config);
            let launch_at_startup = config.server.launch_at_startup;
            let has_model = config.models.default_model != "None";
            let default_model = config.models.default_model.clone();
            drop(config);
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
                get_opla_config,
                get_opla_server_status,
                start_opla_server,
                stop_opla_server
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
