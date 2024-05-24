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
use uuid::Uuid;

use crate::data::workspace;
use crate::data::workspace::Workspace;
use crate::OplaContext;

pub const STATE_CHANGE_EVENT: &str = "state_change_event";
pub const STATE_SYNC_EVENT: &str = "state_sync_event";
pub enum GlobalAppStateWorkspace {
    ACTIVE = 0,
    WORKSPACE = 1,
    ERROR = 2,
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
#[derive(Clone, Debug, Serialize, Deserialize)]
struct Empty {}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(untagged)]
enum Value {
    Bool(bool),
    String(String),
    Number(i32),
    Workspace(Workspace),
    Empty(Empty),
}

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, Serialize, Deserialize)]
struct Payload {
    key: u32,
    value: Option<Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WorkspaceStorage {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub active_workspace_id: Option<String>,
    pub workspaces: HashMap<String, Workspace>,
}

impl WorkspaceStorage {
    pub fn new() -> Self {
        Self {
            active_workspace_id: None,
            workspaces: HashMap::new(),
        }
    }

    pub fn create_workspace(&mut self) -> Workspace {
        let id = Uuid::new_v4();
        let workspace = Workspace::new(id.to_string());
        self.workspaces.insert(id.to_string(), workspace.clone());
        workspace
    }

    pub fn load_active_workspace() {}

    async fn emit_state_async(payload: Payload, app_handle: AppHandle) {
        let context = app_handle.state::<OplaContext>();
        let value = match payload.value {
            Some(v) => v,
            None => Value::Empty(Empty {}),
        };
        println!("Emit state sync: {} {:?}", payload.key, value);
        match GlobalAppStateWorkspace::from(payload.key) {
            GlobalAppStateWorkspace::ACTIVE => {
                if let Value::String(data) = value {
                    let mut store = context.store.lock().await;
                    println!("Set active workspace {:?}", data);
                    store.workspaces.active_workspace_id = Some(data.to_string());
                    app_handle
                        .emit_all(STATE_SYNC_EVENT, Payload {
                            key: payload.key,
                            value: Some(Value::String(data)),
                        })
                        .unwrap();
                    let _ = store.save().map_err(|err| err.to_string());
                } else {
                    let mut store = context.store.lock().await;
                    let workspace = &store.workspaces.create_workspace();
                    let id = workspace.id.to_string();
                    store.workspaces.active_workspace_id = Some(id.to_string());
                    app_handle
                        .emit_all(STATE_SYNC_EVENT, Payload {
                            key: payload.key,
                            value: Some(Value::String(id)),
                        })
                        .unwrap();
                    let _ = store.save().map_err(|err| err.to_string());
                    println!("create active workspace {:?}", workspace.id.to_string());
                }
            }
            GlobalAppStateWorkspace::WORKSPACE => {
                if let Value::Workspace(data) = value {
                    let mut store = context.store.lock().await;

                    let id = data.id.clone();
                    store.workspaces.workspaces.insert(id, data.clone());
                    app_handle
                        .emit_all(STATE_SYNC_EVENT, Payload {
                            key: payload.key,
                            value: Some(Value::Workspace(data)),
                        })
                        .unwrap();
                } else {
                    println!("TODO create a workspace");
                }
            }
            GlobalAppStateWorkspace::ERROR => {
                println!("Not a valid state");
            }
        }
    }


    pub fn subscribe_state_events(&mut self, app_handle: AppHandle) {
        let app_handle_copy = app_handle.app_handle();
        let _id = app_handle.listen_global(STATE_CHANGE_EVENT, move |event| {
            if let Some(payload) = event.payload() {
                let data: Result<Payload, _> = serde_json::from_str(payload);
                match data {
                    Ok(data) => {
                        println!("before spawn");
                        let app_handle = app_handle_copy.app_handle();
                        spawn(async move {
                            WorkspaceStorage::emit_state_async(data, app_handle).await
                        });
                    }
                    Err(e) => {
                        println!("Failed to deserialize payload: {}", e);
                    }
                }
            }
        });
    }

    pub fn init(&mut self, app_handle: AppHandle) {
        self.subscribe_state_events(app_handle);
    }
}
