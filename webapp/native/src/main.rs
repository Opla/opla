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

mod local_server;
mod store;
mod downloader;
mod sys;
pub mod utils;
pub mod api;
pub mod data;
pub mod providers;
pub mod error;
pub mod hash;
pub mod commands;
pub mod engines;

use tokio::{ spawn, sync::Mutex };
use std::sync::Arc;

use api::models;
use downloader::Downloader;
use providers::ProvidersManager;
use store::Store;
use local_server::*;
use sys::Sys;
use tauri::{ EventLoopMessage, Manager, Runtime, State };

pub struct OplaContext {
    pub server: Arc<Mutex<LocalServer>>,
    pub providers_manager: Arc<Mutex<ProvidersManager>>,
    pub store: Mutex<Store>,
    pub downloader: Mutex<Downloader>,
    pub sys: Mutex<Sys>,
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
    let mut server = context.server.lock().await;
    store.server.configuration.set_parameter_string("model_id", active_model);
    store.server.configuration.set_parameter_string("model_path", model_path);
    let response = server.start(app, &store.server.configuration).await;
    if response.is_err() {
        return Err(format!("Opla server not started: {:?}", response));
    }

    store.save().map_err(|err| err.to_string())?;
    println!("Opla server started: {:?}", response);
    Ok(())
}

async fn model_download_event<R: Runtime>(
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
            let model_id = &store.server.configuration.get_optional_parameter_string("model_id");
            store.models.update_model_entity(&m);
            store.save().map_err(|err| err.to_string())?;
            drop(store);
            // println!("model_download {} {}", state, model_id);
            let server = context.server.lock().await;
            if state == "ok" && (model_id.is_none() || m.reference.is_some_id_or_name(model_id)) {
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

async fn window_setup<EventLoopMessage>(app: &mut tauri::AppHandle) -> Result<(), String> {
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
    spawn(async move {
        let handler = handler.app_handle();
        match model_download_event(handler, id.to_string(), state.to_string()).await {
            Ok(_) => {}
            Err(err) => {
                println!("Model downloaded error: {:?}", err);
            }
        }
    });
}

async fn opla_setup(app: &mut tauri::AppHandle) -> Result<(), String> {
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
    store.init(app.app_handle()).await;

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
        store.server.configuration.remove_model();
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

async fn core(app: &mut tauri::AppHandle) {
    let mut error = None;
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
    if !error.is_some() {
        println!("Opla setup done");
        let handle = app.app_handle();
        let _id = app.listen_global("opla-downloader", move |event| {
            let payload = match event.payload() {
                Some(p) => { p }
                None => {
                    return;
                }
            };
            // println!("download event {}", payload);
            handle_download_event::<EventLoopMessage>(&handle, payload);
        });
    }
}

fn main() {
    let downloader = Mutex::new(Downloader::new());
    let context: OplaContext = OplaContext {
        server: Arc::new(Mutex::new(LocalServer::new())),
        providers_manager: Arc::new(Mutex::new(ProvidersManager::new())),
        store: Mutex::new(Store::new()),
        downloader: downloader,
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

            let mut handle = app.handle();
            tauri::async_runtime::block_on(async {
                core(&mut handle).await;
            });

            Ok(())
        })
        .invoke_handler(
            tauri::generate_handler![
                crate::commands::get_sys,
                crate::commands::get_opla_configuration,
                crate::commands::save_settings,
                crate::commands::get_config_path,
                crate::commands::get_data_path,
                crate::commands::get_models_path,
                crate::commands::set_models_path,
                crate::commands::create_dir,
                crate::commands::file_exists,
                crate::commands::show_in_folder,
                crate::commands::choose_directory,
                crate::commands::asset::get_file_asset_extensions,
                crate::commands::asset::validate_assets,
                crate::commands::provider::get_provider_template,
                crate::commands::server::get_opla_server_status,
                crate::commands::server::start_opla_server,
                crate::commands::server::stop_opla_server,
                crate::commands::model::get_models_collection,
                crate::commands::model::get_model_file,
                crate::commands::model::search_hfhub_models,
                crate::commands::model::get_model_full_path,
                crate::commands::model::install_model,
                crate::commands::model::cancel_download_model,
                crate::commands::model::uninstall_model,
                crate::commands::model::update_model,
                crate::commands::model::update_model_entity,
                crate::commands::model::set_active_model,
                crate::commands::assistant::get_assistants_collection,
                crate::commands::llm::llm_call_completion,
                crate::commands::llm::llm_cancel_completion,
                crate::commands::llm::llm_call_tokenize,
                crate::commands::llm::llm_call_image_generation,
                crate::commands::llm::llm_call_models,
                crate::commands::thread::load_conversation_messages,
                crate::commands::thread::save_conversation_messages,
                crate::commands::thread::remove_conversation_messages,
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
