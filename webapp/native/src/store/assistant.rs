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

use crate::data::assistant::Assistant;
use crate::store::app_state::STATE_SYNC_EVENT;
use crate::utils::get_config_directory;
use crate::OplaContext;

use super::app_state::{ Empty, EventPayload, GlobalAppState, Value, STATE_CHANGE_EVENT };

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssistantStorage {
    pub assistants: Vec<Assistant>,
}

impl AssistantStorage {
    pub fn new() -> Self {
        Self {
            assistants: Vec::new(),
        }
    }

    async fn emit_state_async(payload: EventPayload, app_handle: AppHandle) {
        let context = app_handle.state::<OplaContext>();
        let value = match payload.value {
            Some(v) => v,
            None => Value::Empty(Empty {}),
        };
        println!("Assistant emit state sync: {} {:?}", payload.key, value);
        match GlobalAppState::from(payload.key) {
            GlobalAppState::ASSISTANTS => {
                let mut store = context.store.lock().await;
                if let Value::Assistants(data) = value {
                    store.assistants.assistants = data.assistants.clone();
                    store.save_assistants();
                } else if let Value::Empty(_) = value {
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                    return;
                }

                app_handle
                    .emit_all(STATE_SYNC_EVENT, EventPayload {
                        key: payload.key,
                        value: Some(
                            Value::Assistants(crate::store::app_state::ValueAssistants {
                                assistants: store.assistants.assistants.clone(),
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
        let assistants_path = home_dir.join("assistants.json");

        let data = serde_json::to_string_pretty(&self.assistants)?;
        write(assistants_path, data)?;

        Ok(())
    }

    pub fn load(&mut self, asset_dir: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
        let home_dir = get_config_directory()?;
        let config_path = home_dir.join("assistants.json");

        if config_path.exists() {
            let data = read_to_string(config_path)?;
            let assistants: Vec<Assistant> = serde_json::from_str(&data)?;
            self.assistants = assistants;
        }
        if self.assistants.len() == 0 {
            // Load default assistants
            let default_assistants_path = asset_dir.join("default_assistants.json");
            if default_assistants_path.exists() {
                let data = read_to_string(default_assistants_path)?;
                let assistants: Vec<Assistant> = serde_json::from_str(&data)?;
                println!("default_assistants: {:?}", assistants);
                self.assistants = assistants;
            } else {
                panic!("Default assistants not found: {:?}", default_assistants_path);
            }
            if let Err(error) = self.save() {
                println!("Can't save default assistants: {:?}", error.to_string());
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
            println!("Can't load assistants: {:?}", error.to_string());
        };
    }
}
