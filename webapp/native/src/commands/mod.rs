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

use std::path::{ Path, PathBuf };

use crate::store::{settings::Settings, Store};
use crate::OplaContext;
use crate::sys::SysInfos;
use tauri::{ Runtime, State };
use crate::utils::{ get_config_directory, get_data_directory };

pub mod asset;
pub mod assistant;
pub mod llm;
pub mod model;
pub mod provider;
pub mod server;
pub mod thread;

#[tauri::command]
pub async fn get_sys<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<SysInfos, String> {
    let sys = context.sys.lock().await.refresh();
    Ok(sys)
}

#[tauri::command]
pub async fn get_opla_configuration<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Store, String> {
    let store = context.store.lock().await;
    Ok(store.clone())
}

#[tauri::command]
pub async fn save_settings<R: Runtime>(
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
pub async fn get_config_path<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>
) -> Result<String, String> {
    let config_dir = get_config_directory()?;
    let config_dir = match config_dir.to_str() {
        Some(c) => { c }
        None => {
            return Err(format!("Failed to get config path"));
        }
    };
    println!("Config path: {:?}", config_dir);
    Ok(config_dir.to_string())
}

#[tauri::command]
pub async fn get_data_path<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>
) -> Result<String, String> {
    let path = get_data_directory()?;
    let path = match path.to_str() {
        Some(d) => { d }
        None => {
            return Err(format!("Failed to get data path"));
        }
    };
    Ok(path.to_string())
}

#[tauri::command]
pub async fn show_in_folder<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    path: String
) -> Result<(), String> {
    showfile::show_path_in_file_manager(path);
    Ok(())
}

#[tauri::command]
pub async fn get_models_path<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<String, String> {
    let store = context.store.lock().await;
    let path = match store.models.get_models_path() {
        Ok(p) => { p }
        _ => {
            return Err(format!("Failed to get models path"));
        }
    };
    let path = match path.to_str() {
        Some(d) => { d }
        None => {
            return Err(format!("Failed to get models path"));
        }
    };
    Ok(path.to_string())
}

#[tauri::command]
pub async fn set_models_path<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    models_path: Option<String>,
) -> Result<String, String> {
    let mut store = context.store.lock().await;
    let result = store.models.set_models_path(models_path);

     store.save().map_err(|err| err.to_string())?;

    result
}

#[tauri::command]
pub async fn create_dir<R: Runtime>(
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
pub async fn file_exists<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    file_name: String
) -> Result<bool, String> {
    let mut dir;
    let absolute = Path::new(file_name.as_str()).is_absolute();
    if !absolute {
        dir = get_data_directory()?;
    } else {
        dir = PathBuf::new();
    }
    dir = dir.join(file_name);
    let result = dir.is_file();

    Ok(result)
}

#[tauri::command]
pub async fn choose_directory() -> Result<Option<String>, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;

    let directory_or_none: Option<String> = match FileDialogBuilder::new().pick_folder() {
        Some(path) => match path.to_str() {
            Some(path) => Some(path.to_string()),
            None => None,
        },
        None => None,
    };

    Ok(directory_or_none)
}
