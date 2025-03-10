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

use crate::ServerStatus;
use crate::{ api::hf::search_hf_models, start_server, OplaContext };
use crate::data::model::{ Model, ModelEntity };
use crate::models::{ fetch_models_collection, ModelsCollection };
use opla_core::gguf::GGUF;
use serde::Serialize;
use tauri::{ Manager, Runtime, State };

#[tauri::command]
pub async fn get_models_collection<R: Runtime>(
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
pub async fn search_hfhub_models<R: Runtime>(
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
pub async fn get_model_full_path<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    path: String,
    filename: String
) -> Result<String, String>
    where Result<ModelsCollection, String>: Serialize
{
    let store = context.store.lock().await;
    let error = format!("Model path not valid: {:?}", filename.clone());
    let result = store.models.get_full_path(path, Some(filename));
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
pub async fn install_model<R: Runtime>(
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
    let file_size = model.get_file_size();
    let sha = model.get_sha();
    let (mut model_entity, model_id) = store.models.create_model(
        model,
        Some("pending".to_string()),
        Some(path.clone()),
        Some(file_name.clone())
    );

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
            store.models.emit_update_all(app.app_handle());
            drop(store);
            let mut downloader = context.downloader.lock().await;
            downloader.download_file(
                model_id.clone(),
                u,
                model_path,
                file_name.as_str(),
                sha,
                file_size,
                app
            );
        }
        None => {
            model_entity.state = Some("ok".to_string());
            store.models.add_model(model_entity);
            store.save().map_err(|err| err.to_string())?;
            store.models.emit_update_all(app.app_handle());
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
pub async fn cancel_download_model<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_name_or_id: String
) -> Result<(), String> {
    let mut store = context.store.lock().await;
    println!("Cancel download model: {:?}", model_name_or_id);
    let mut downloader = context.downloader.lock().await;
    downloader.cancel_download(&model_name_or_id, &app);

    let model = store.models.get_model(model_name_or_id.as_str());
    println!("Cancel download model: {:?}", model);
    match model {
        Some(m) => {
            let model_id = store.server.configuration.get_optional_parameter_string("model_id");
            store.models.remove_model(model_name_or_id.as_str(), false);
            store.clear_active_service_if_model_equal(m.id.clone());
            store.save().map_err(|err| err.to_string())?;
            store.models.emit_update_all(app.app_handle());
            drop(store);

            let mut server = context.server.lock().await;
            /* match &server.parameters {
                Some(p) => {
                    if m.is_some_id_or_name(&p.model_id) {
                        let _res = server.stop(&app).await;
                    }
                }
                None => {}
            }; */

            if m.is_some_id_or_name(&model_id) {
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
pub async fn update_model<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Model
) -> Result<(), String> {
    let mut store = context.store.lock().await;

    store.models.update_model(model);

    store.save().map_err(|err| err.to_string())?;
    store.models.emit_update_all(app.app_handle());

    Ok(())
}

#[tauri::command]
pub async fn update_model_entity<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Model,
    entity: ModelEntity
) -> Result<(), String> {
    let mut store = context.store.lock().await;

    store.models.update_model_entity(&entity);
    store.models.update_model(model);
    store.save().map_err(|err| err.to_string())?;
    store.models.emit_update_all(app.app_handle());

    Ok(())
}

#[tauri::command]
pub async fn uninstall_model<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_id: String,
    in_use: bool
) -> Result<(), String> {
    let mut store = context.store.lock().await;

    println!("Uninstall model: {:?} {:?}", model_id, in_use);

    match store.models.remove_model(model_id.as_str(), in_use) {
        Some(model) => {
            store.clear_active_service_if_model_equal(model.reference.id.clone());
            let mut server = context.server.lock().await;
            if
                model.reference.is_some_id_or_name(
                    &store.server.configuration.get_optional_parameter_string("model_id")
                )
            {
                let _res = server.stop(&app).await;
                store.server.configuration.remove_model();
            }
        }
        None => {
            return Err(format!("Model not found: {:?}", model_id));
        }
    }

    store.save().map_err(|err| err.to_string())?;
    store.models.emit_update_all(app.app_handle());

    Ok(())
}

#[tauri::command]
pub async fn set_active_model<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_id: String,
    provider: Option<String>
) -> Result<(), String> {
    let mut store = context.store.lock().await;
    let result = store.models.get_model(model_id.as_str());
    let provider_name: String;
    let mut status = ServerStatus::Started;
    if result.is_none() && (provider.is_none() || provider.as_deref() == Some("Opla")) {
        return Err(format!("Model not found: {:?}", model_id));
    } else if provider.is_some() {
        provider_name = provider.unwrap_or("Opla".to_string());
        store.set_active_service(&model_id, &provider_name);
    } else {
        provider_name = "Opla".to_string();
        store.set_local_active_model_id(&model_id);
    }
    if provider_name == "Opla" {
        let server = context.server.lock().await;
        status = match server.status.try_lock() {
            Ok(s) => s.to_owned(),
            Err(_) => {
                println!("Opla server error try to read status");
                return Err("Opla server can't read status".to_string());
            }
        };
        if
            status != ServerStatus::Started ||
            status != ServerStatus::Starting
        {
            store.server.configuration.set_parameter_string("model_id", model_id);
            store.server.configuration.remove_parameter("model_path");
        }
    }
    store.save().map_err(|err| err.to_string())?;
    if status != ServerStatus::Started || status != ServerStatus::Starting {
        store.server.emit_update_all(app.app_handle());
    }
    store.models.emit_update_all(app.app_handle());

    Ok(())
}

#[tauri::command]
pub async fn get_model_file<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_id: String
) -> Result<GGUF, String> {
    let store = context.store.lock().await;
    let gguf = store.models.get_model_file(model_id)?;
    Ok(gguf)
}
