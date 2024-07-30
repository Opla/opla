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

use std::{ fs::{ read_to_string, write }, path::PathBuf };
use serde::{ Deserialize, Serialize };
use tauri::{ AppHandle, Manager };
use tokio::spawn;

use crate::data::Preset;
use crate::store::app_state::STATE_SYNC_EVENT;
use crate::utils::get_config_directory;
use crate::OplaContext;

use super::app_state::{ Empty, Payload, GlobalAppState, Value, STATE_CHANGE_EVENT };

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PresetStorage {
    pub presets: Vec<Preset>,
}

impl PresetStorage {
    pub fn new() -> Self {
        Self {
            presets: Vec::new(),
        }
    }

    async fn emit_state_async(payload: Payload, app_handle: AppHandle) {
        let context = app_handle.state::<OplaContext>();
        let value = match payload.value {
            Some(v) => v,
            None => Value::Empty(Empty {}),
        };
        println!("Preset emit state sync: {} {:?}", payload.key, value);
        match GlobalAppState::from(payload.key) {
            GlobalAppState::PRESETS => {
                let mut store = context.store.lock().await;
                if let Value::Presets(data) = value {
                    store.presets.presets = data.presets.clone();
                    store.save_presets();
                } else if let Value::Empty(_) = value {
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                    return;
                }

                app_handle
                    .emit_all(STATE_SYNC_EVENT, Payload {
                        key: payload.key,
                        value: Some(
                            Value::Presets(crate::store::app_state::ValuePresets {
                                presets: store.presets.presets.clone(),
                            })
                        ),
                    })
                    .unwrap();
            }
            _ => {}
        }
    }

    pub fn subscribe_state_events(&mut self, app_handle: AppHandle) {
        let app_handle_copy = app_handle.app_handle();
        let _id = app_handle.listen_global(STATE_CHANGE_EVENT, move |event| {
            if let Some(payload) = event.payload() {
                match serde_json::from_str(payload) {
                    Ok(data) => {
                        let app_handle = app_handle_copy.app_handle();
                        spawn(async move { Self::emit_state_async(data, app_handle).await });
                    }
                    Err(e) => {
                        println!("Failed to deserialize payload: {}", e);
                    }
                }
            }
        });
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let home_dir = get_config_directory()?;
        let presets_path = home_dir.join("presets.json");

        let data = serde_json::to_string_pretty(&self.presets)?;
        write(presets_path, data)?;

        Ok(())
    }

    pub fn load(&mut self, asset_dir: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
        let home_dir = get_config_directory()?;
        let config_path = home_dir.join("presets.json");

        if config_path.exists() {
            let data = read_to_string(config_path)?;
            let presets: Vec<Preset> = serde_json::from_str(&data)?;
            self.presets = presets;
        }
        if self.presets.len() == 0 {
            // Load default presets
            let default_presets_path = asset_dir.join("default_presets.json");
            if default_presets_path.exists() {
                let data = read_to_string(default_presets_path)?;
                let presets: Vec<Preset> = serde_json::from_str(&data)?;
                println!("default_presets: {:?}", presets);
                self.presets = presets;
            } else {
                panic!("Default presets not found: {:?}", default_presets_path);
            }
            if let Err(error) = self.save() {
                println!("Can't save default presets: {:?}", error.to_string());
            };
        }
        Ok(())
    }

    pub fn init(&mut self, app_handle: AppHandle) {
        self.subscribe_state_events(app_handle.app_handle());
        let resource_path = app_handle.path_resolver().resolve_resource("assets");
        let resource_path = match resource_path {
            Some(r) => { r }
            None => {
                println!("Opla failed to resolve resource path: {:?}", resource_path);
                return;
            }
        };
        if let Err(error) = self.load(resource_path) {
            println!("Can't load presets: {:?}", error.to_string());
        };
    }
}
