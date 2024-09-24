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

use crate::data::provider::Provider;
use crate::store::app_state::STATE_SYNC_EVENT;
use crate::utils::get_config_directory;
use crate::OplaContext;

use super::app_state::{ Empty, EventPayload, GlobalAppState, StateEvent, Value };

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProviderStorage {
    pub providers: Vec<Provider>,
}

impl ProviderStorage {
    pub fn new() -> Self {
        Self {
            providers: Vec::new(),
        }
    }

    async fn emit_state_async(payload: EventPayload, app_handle: AppHandle) {
        let context = app_handle.state::<OplaContext>();
        let value = match payload.value {
            Some(v) => v,
            None => Value::Empty(Empty {}),
        };
        println!("Provider emit state sync: {} {:?}", payload.key, value);
        match GlobalAppState::from(payload.key) {
            GlobalAppState::PROVIDERS => {
                let mut store = context.store.lock().await;
                if let Value::Providers(data) = value {
                    store.providers.providers = data.providers.clone();
                    store.save_providers();
                } else if let Value::Empty(_) = value {
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                    return;
                }

                app_handle
                    .emit_all(STATE_SYNC_EVENT, EventPayload {
                        key: payload.key,
                        value: Some(
                            Value::Providers(crate::store::app_state::ValueProviders {
                                providers: store.providers.providers.clone(),
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
        let _id = app_handle.listen_global(StateEvent::PROVIDER.to_string(), move |event| {
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
        let providers_path = home_dir.join("providers.json");

        let data = serde_json::to_string_pretty(&self.providers)?;
        write(providers_path, data)?;

        Ok(())
    }

    pub fn load(&mut self, asset_dir: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
        let home_dir = get_config_directory()?;
        let config_path = home_dir.join("providers.json");

        if config_path.exists() {
            let data = read_to_string(config_path)?;
            let providers: Vec<Provider> = serde_json::from_str(&data)?;
            self.providers = providers;
        }
        if self.providers.len() == 0 {
            // Load default providers
            let default_providers_path = asset_dir.join("default_providers.json");
            if default_providers_path.exists() {
                let data = read_to_string(default_providers_path)?;
                let providers: Vec<Provider> = serde_json::from_str(&data)?;
                println!("default_providers: {:?}", providers);
                self.providers = providers;
            } else {
                panic!("Default providers not found: {:?}", default_providers_path);
            }
            if let Err(error) = self.save() {
                println!("Can't save default providers: {:?}", error.to_string());
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
            println!("Can't load providers: {:?}", error.to_string());
        };
    }
}
