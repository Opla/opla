// Copyright 2024 mik
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

use std::collections::HashMap;
use serde::{ self, Deserialize, Serialize };
use tauri::Manager;
use tauri::AppHandle;
use tokio::spawn;

use crate::data::workspace::Workspace;
use crate::OplaContext;

pub const STATE_CHANGE_EVENT: &str = "state_change_event";
pub const STATE_SYNC_EVENT: &str = "state_sync_event";
pub enum GlobalAppStateWorkspace {
    ERROR = 2,
    ACTIVE = 0,
    WORKSPACE = 1,
}

impl From<u32> for GlobalAppStateWorkspace {
    fn from(item: u32) -> Self {
        match item {
            0 => GlobalAppStateWorkspace::ACTIVE,
            1 => GlobalAppStateWorkspace::WORKSPACE,
            _ => {
                println!("Not a valid value for the enum GlobalAppStateWorkspace");
                GlobalAppStateWorkspace::ERROR
            }
        }
    }
}

impl Into<u32> for GlobalAppStateWorkspace {
    fn into(self) -> u32 {
        match self {
            GlobalAppStateWorkspace::ERROR => 2,
            GlobalAppStateWorkspace::ACTIVE => 0,
            GlobalAppStateWorkspace::WORKSPACE => 1,
        }
    }
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
enum Value {
    Bool(bool),
    String(String),
    Number(i32),
    Workspace(Workspace),
}

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct Payload {
    key: u32,
    value: Value,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WorkspaceStorage {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub active_workspace: Option<String>,
    pub workspaces: HashMap<String, Workspace>,
}

impl WorkspaceStorage {
    pub fn new() -> Self {
        Self {
            active_workspace: None,
            workspaces: HashMap::new(),
        }
    }

    pub fn load_active_workspace() {}

    async fn emit_state_async(payload: Payload, app_handle: AppHandle) {
        let context = app_handle.state::<OplaContext>();
        match GlobalAppStateWorkspace::from(payload.key) {
            GlobalAppStateWorkspace::ACTIVE => {
                if let Value::String(data) = payload.value {
                    let mut store = context.store.lock().await;
                    store.workspaces.active_workspace = Some(data.to_string());
                    app_handle
                        .emit_all(STATE_SYNC_EVENT, Payload {
                            key: payload.key,
                            value: Value::String(data),
                        })
                        .unwrap();
                    let _ = store.save().map_err(|err| err.to_string());
                }
            }
            GlobalAppStateWorkspace::WORKSPACE => {
                if let Value::Workspace(data) = payload.value {
                    let mut store = context.store.lock().await;

                    let id = data.id.clone();
                    match id {
                        Some(id) => {
                            store.workspaces.workspaces.insert(id.clone(), data.clone());
                        }
                        None => {
                            // println!("unset id for this workspace: {:?}", data.clone());
                        }
                    }
                    app_handle
                        .emit_all(STATE_SYNC_EVENT, Payload {
                            key: payload.key,
                            value: Value::Workspace(data),
                        })
                        .unwrap();
                }
            }
            GlobalAppStateWorkspace::ERROR => {
                println!("Not a valid state");
            },
        }
    }

    fn emit_state_sync(data: Payload, app_handle: AppHandle) {
        spawn(async move { WorkspaceStorage::emit_state_async(data, app_handle) });
    }

    pub async fn subscribe_state_events(app_handle: AppHandle) {
        let app_handle_clone = app_handle.clone();
        let _id = app_handle.listen_global(STATE_CHANGE_EVENT, move |event| {
            if let Some(payload) = event.payload() {
                let data: Result<Payload, _> = serde_json::from_str(payload);
                match data {
                    Ok(data) => {
                        WorkspaceStorage::emit_state_sync(data, app_handle_clone.clone())
                    }
                    Err(e) => {
                        println!("Failed to deserialize payload: {}", e);
                    }
                }
            }
        });
    }
}
