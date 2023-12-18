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
mod config;
pub mod utils;

use std::sync::Mutex;

use config::Config;
use server::*;
use tauri::{ Runtime, State, Manager };

#[tauri::command]
async fn get_opla_config<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    opla_app: State<'_, OplaState>
) -> Result<Config, String> {
    let config = opla_app.config.lock().unwrap();
    Ok(config.clone())
}

#[tauri::command]
async fn get_opla_server_status<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    opla_app: State<'_, OplaState>
) -> Result<OplaServerResponse, String> {
    opla_app.server.lock().unwrap().get_status()
}

#[tauri::command]
async fn start_opla_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    opla_app: State<'_, OplaState>,
    model: String,
    port: i32,
    host: String,
    context_size: i32,
    threads: i32,
    n_gpu_layers: i32
) -> Result<OplaServerResponse, String> {
    println!("Opla try to start ");
    let mut config = opla_app.config.lock().unwrap();
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
    config.save_config().expect("Failed to save config");

    let response = opla_app.server
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
    opla_app: State<'_, OplaState>
) -> Result<OplaServerResponse, String> {
    opla_app.server.lock().unwrap().stop(app)
}

fn start_server<R: Runtime>(app: tauri::AppHandle<R>, opla_app: State<'_, OplaState>) {
    println!("TODO Opla try to start at startup");
    let config = opla_app.config.lock().unwrap();
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
    let response = opla_app.server
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
    let config = Config::load_config().unwrap();
    let server = OplaServer::new();
    let opla_app: OplaState = OplaState {
        server: Mutex::new(server),
        config: Mutex::new(config.clone()),
    };
    tauri::Builder
        ::default()
        .manage(opla_app)
        .setup(move |app| {
            let opla_app = app.state::<OplaState>();
            app.emit_all("opla-server", Payload {
                message: "Init Opla backend".into(),
                status: ServerStatus::Wait.as_str().to_string(),
            }).unwrap();
            opla_app.server.lock().unwrap().init();
            if config.server.launch_at_startup {
                start_server(app.app_handle(), opla_app);
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
