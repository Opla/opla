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

use std::sync::Mutex;

use server::*;
use tauri::{ Runtime, State, Manager };

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

    let response = opla_app.server
        .lock()
        .unwrap()
        .start(app, [
            "-m",
            model.as_str(),
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

fn main() {
    let server = OplaServer::new();
    let opla_app: OplaState = OplaState {
        server: Mutex::new(server),
    };
    tauri::Builder
        ::default()
        .manage(opla_app)
        .setup(|app| {
            let opla_app = app.state::<OplaState>();
            app.emit_all("opla-server", Payload {
                message: "Init Opla backend".into(),
                status: ServerStatus::Wait.as_str().to_string(),
            }).unwrap();
            opla_app.server.lock().unwrap().init();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![start_opla_server, stop_opla_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
