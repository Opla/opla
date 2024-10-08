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

use tauri::{ Manager, Runtime, State };
use crate::{data::{Metadata, Payload}, OplaContext};

#[tauri::command]
pub async fn get_opla_server_status<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Payload, String> {
    let server = context.server.lock().await;
    server.get_status()
}

#[tauri::command]
pub async fn start_opla_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    parameters: Metadata,
) -> Result<Payload, String> {
    println!("Opla try to start ");
    let mut store = context.store.lock().await;
    let model_id = match parameters.get("model") {
        Some(m) => { m.to_string() }
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

    let res = store.models.get_model_path(model_id.clone());
    let model_path = match res {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Opla server not started model not found: {:?}", err));
        }
    };
    
    let mut configuration = store.server.configuration.clone();
    configuration.parameters = parameters.clone();
    configuration.set_parameter_string("model_id", model_id);
    configuration.set_parameter_string("model_path", model_path);

    if (!store.server.launch_at_startup) || configuration.parameters != store.server.configuration.parameters {
        store.server.launch_at_startup = true;
        store.server.configuration = configuration;
        store.save().map_err(|err| err.to_string())?;
        store.server.emit_update_all(app.app_handle());
    }

    let mut server = context.server.lock().await;
    server.start(app, &store.server.configuration).await
}

#[tauri::command]
pub async fn stop_opla_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Payload, String> {
    let mut server = context.server.lock().await;
    let mut store = context.store.lock().await;
    store.server.launch_at_startup = false;
    store.save().map_err(|err| err.to_string())?;
    server.stop(&app).await
}
