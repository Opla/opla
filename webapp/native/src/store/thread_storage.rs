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

use std::collections::HashMap;
use std::fs::{ create_dir_all, read_to_string, remove_file, write };
use std::path::PathBuf;
use serde::{ Deserialize, Serialize };
use tauri::{ AppHandle, Manager };
use tokio::spawn;

use crate::store::app_state::STATE_SYNC_EVENT;
use crate::OplaContext;
use crate::{ data::{ conversation::Conversation, message::Message }, utils::get_data_directory };

use super::app_state::{ Empty, Payload, GlobalAppState, Value, STATE_CHANGE_EVENT };

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ThreadStorage {
    pub conversations: Vec<Conversation>,
    pub messages: HashMap<String, Vec<Message>>,
    pub archives: Vec<Conversation>,
}

impl ThreadStorage {
    pub fn new() -> Self {
        Self {
            conversations: Vec::new(),
            messages: HashMap::new(),
            archives: Vec::new(),
        }
    }

    async fn emit_state_async(payload: Payload, app_handle: AppHandle) {
        let context = app_handle.state::<OplaContext>();
        let value = match payload.value {
            Some(v) => v,
            None => Value::Empty(Empty {}),
        };
        println!("Emit state sync: {} {:?}", payload.key, value);
        let mut need_emit = false;
        let mut emit_value: Option<Value> = None;
        match GlobalAppState::from(payload.key) {
            GlobalAppState::CONVERSATIONS => {
                let mut store = context.store.lock().await;
                if let Value::Conversations(data) = value {
                    store.threads.conversations = data.clone();
                    store.save_conversations();
                    need_emit = true;
                } else if let Value::Empty(_) = value {
                    need_emit = true;
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                }
                if need_emit {
                    emit_value = Some(Value::Conversations(store.threads.conversations.clone()));
                }
            }
            GlobalAppState::DELETECONVERSATION => {
                if let Value::String(data) = value {
                    let mut store = context.store.lock().await;
                    store.threads.remove_conversation(data);
                    store.save_conversations();
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                }
            }
            GlobalAppState::ARCHIVES => {
                let mut store = context.store.lock().await;
                if let Value::Conversations(data) = value {
                    store.threads.archives = data.clone();
                    store.save_archives();
                    need_emit = true;
                } else if let Value::Empty(_) = value {
                    need_emit = true;
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                }
                if need_emit {
                    emit_value = Some(Value::Conversations(store.threads.archives.clone()));
                }
            }
            _ => {
                // Others do nothing
            }
        }
        if need_emit {
            app_handle
                .emit_all(STATE_SYNC_EVENT, Payload {
                    key: payload.key,
                    value: emit_value,
                })
                .unwrap();
        }
    }

    pub fn subscribe_state_events(&mut self, app_handle: AppHandle) {
        let app_handle_copy = app_handle.app_handle();
        let _id = app_handle.listen_global(STATE_CHANGE_EVENT, move |event| {
            if let Some(payload) = event.payload() {
                match serde_json::from_str(payload) {
                    Ok(data) => {
                        println!("before spawn");
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

    pub fn remove_conversation(&mut self, conversation_id: String) {
        if let Some(pos) = self.conversations.iter().position(|c| *c.id == conversation_id) {
            self.conversations.remove(pos);
        }
    }

    pub fn create_threads_path(name: &str, path: &PathBuf) -> PathBuf {
        path.join(format!(".opla/{}.json", name))
    }

    pub fn load_threads(&mut self, path: &PathBuf) -> Result<Vec<Conversation>, String> {
        let default_config_data = read_to_string(path).map_err(|e| e.to_string())?;
        let conversations: Vec<Conversation> = serde_json
            ::from_str(&default_config_data)
            .map_err(|e| e.to_string())?;
        Ok(conversations)
    }

    pub fn save_threads(&mut self, name: &str, path: &PathBuf) -> Result<(), String> {
        let conversations_path = &Self::create_threads_path(name, path);
        let prefix = conversations_path.parent().unwrap();
        create_dir_all(prefix).map_err(|e| e.to_string())?;
        println!("save {}: {:?} {:?}", name, conversations_path, prefix);
        let threads = if name == "archives" { &self.archives } else { &self.conversations };
        let json = serde_json::to_string_pretty(threads).map_err(|e| e.to_string())?;
        write(conversations_path, json).map_err(|e| e.to_string())?;

        Ok(())
    }

    pub async fn init_threads(&mut self, name: &str, project_path: PathBuf) {
        let conversations_path = &Self::create_threads_path(name, &project_path);
        if conversations_path.exists() {
            match self.load_threads(&conversations_path) {
                Ok(conversations) => {
                    println!("Loaded project's {}: {:?}", name, conversations);
                    if name == "conversations" {
                        self.conversations = conversations;
                    } else if name == "archives" {
                        self.archives = conversations;
                    }
                }
                Err(error) => {
                    println!(
                        "Error Loading project's {}: {:?} {:?}",
                        name,
                        error,
                        conversations_path
                    );
                }
            }
            return;
        }
        // Otherwise import previous format
        let previous_conversations_path = match get_data_directory() {
            Ok(path) => path.join(format!("{}.json", name)),
            Err(_) => {
                return;
            }
        };
        if !previous_conversations_path.exists() {
            return;
        }
        match self.load_threads(&previous_conversations_path) {
            Ok(conversations) => {
                println!("Loaded {}: {:?}", name, conversations);
                if name == "conversations" {
                    self.conversations = conversations;
                } else if name == "archives" {
                    self.archives = conversations;
                }
                if let Err(error) = self.save_threads(name, &project_path) {
                    println!("Error converting {}: {:?}", name, error);
                    return;
                }
            }
            Err(error) => {
                println!("Error Loading previous {}: {:?} {:?}", name, error, previous_conversations_path);
                return;
            }
        }
        // Remove previous format {name}.json
        if let Err(error) = remove_file(previous_conversations_path) {
            println!("Error Removing previous {}: {:?}", name, error);
        }
    }

    pub async fn init(&mut self, app_handle: AppHandle, project_path: PathBuf) {
        self.subscribe_state_events(app_handle.app_handle());

        self.init_threads("conversations", project_path.clone()).await;
        // TODO import previous messages.json

        self.init_threads("archives", project_path).await;
    }
}
