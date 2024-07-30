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
use std::fs::{ create_dir_all, read_to_string, remove_dir, remove_file, write };
use std::path::PathBuf;
use serde::{ Deserialize, Serialize };
use tauri::{ AppHandle, Manager };
use tokio::spawn;

use crate::store::app_state::{ ValueAllConversations, ValueConversations, STATE_SYNC_EVENT };
use crate::OplaContext;
use crate::{ data::{ conversation::Conversation, message::Message }, utils::get_data_directory };

use super::app_state::{
    Empty,
    GlobalAppState,
    Payload,
    Value,
    ValueConversationMessages,
    STATE_CHANGE_EVENT,
};

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
        println!("Thread emit state sync: {} {:?}", payload.key, value);
        let mut need_emit = false;
        let mut emit_value: Option<Value> = None;
        match GlobalAppState::from(payload.key) {
            GlobalAppState::ALLCONVERSATIONS => {
                let mut store = context.store.lock().await;
                if let Value::AllConversations(data) = value {
                    store.threads.conversations = data.conversations.clone();
                    store.save_conversations();
                    store.threads.archives = data.archives.clone();
                    store.save_archives();
                    need_emit = true;
                } else if let Value::Empty(_) = value {
                    need_emit = true;
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                }
                if need_emit {
                    emit_value = Some(
                        Value::AllConversations(ValueAllConversations {
                            conversations: store.threads.conversations.clone(),
                            archives: store.threads.archives.clone(),
                        })
                    );
                }
            }
            GlobalAppState::CONVERSATIONS => {
                let mut store = context.store.lock().await;
                if let Value::Conversations(data) = value {
                    store.threads.conversations = data.conversations.clone();
                    store.save_conversations();
                    need_emit = true;
                } else if let Value::Empty(_) = value {
                    need_emit = true;
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                }
                if need_emit {
                    emit_value = Some(
                        Value::Conversations(ValueConversations {
                            conversations: store.threads.conversations.clone(),
                        })
                    );
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
                    store.threads.archives = data.conversations.clone();
                    store.save_archives();
                    need_emit = true;
                } else if let Value::Empty(_) = value {
                    need_emit = true;
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                }
                if need_emit {
                    emit_value = Some(
                        Value::Conversations(ValueConversations {
                            conversations: store.threads.archives.clone(),
                        })
                    );
                }
            }
            GlobalAppState::CONVERSATIONMESSAGES => {
                let mut store = context.store.lock().await;
                if let Value::ConversationMessages(data) = &value {
                    if let Some(messages) = &data.messages {
                        if
                            let Err(error) = store.save_conversation_messages(
                                &data.conversation_id,
                                messages.clone(),
                                app_handle.app_handle()
                            )
                        {
                            println!(
                                "Error saving conversation messages: {} {:?}",
                                payload.key,
                                error
                            );
                        }
                    } else {
                        need_emit = true;
                        let conversation_id = data.conversation_id.clone();
                        println!(
                            "Empty conversationMessages {:?} {:?}",
                            store.threads.messages,
                            conversation_id
                        );
                        if !store.threads.messages.contains_key(&conversation_id) {
                            if
                                let Err(error) = store.load_conversation_messages(
                                    &conversation_id,
                                    true,
                                    None
                                )
                            {
                                println!(
                                    "Error loading conversation messages: {} {:?}",
                                    payload.key,
                                    error
                                );
                                store.threads.messages.insert(conversation_id.clone(), Vec::new());
                            }
                        }
                        println!(
                            "Loaded conversationMessages {:?} {:?}",
                            store.threads.messages,
                            conversation_id
                        );
                        emit_value = Some(
                            Value::ConversationMessages(ValueConversationMessages {
                                conversation_id,
                                messages: store.threads.messages
                                    .get(&data.conversation_id)
                                    .cloned(),
                            })
                        );
                    }
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                }
            }
            GlobalAppState::MESSAGES => {
                let mut store = context.store.lock().await;
                if let Value::Messages(data) = &value {
                    store.threads.messages = data.clone();
                    // store.save_archives();
                    need_emit = true;
                    emit_value = Some(value);
                } else if let Value::Empty(_) = value {
                    need_emit = true;
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                }
                if need_emit {
                    emit_value = Some(Value::Messages(store.threads.messages.clone()));
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

    fn emit_event(app_handle: AppHandle, key: GlobalAppState, value: Value) {
        app_handle
            .emit_all(STATE_SYNC_EVENT, Payload {
                key: key.into(),
                value: Some(value),
            })
            .unwrap();
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

    pub fn remove_conversation(&mut self, conversation_id: String) {
        if let Some(pos) = self.conversations.iter().position(|c| *c.id == conversation_id) {
            self.conversations.remove(pos);
        }
    }

    pub fn remove_conversation_messages(
        &mut self,
        conversation_id: &str,
        path: &PathBuf,
        app_handle: AppHandle
    ) -> Result<(), String> {
        self.messages.remove(conversation_id);
        let conversation_path = &Self::create_conversation_path(conversation_id, path);
        let conversation_file = conversation_path.join("messages.json");
        remove_file(conversation_file).map_err(|e| e.to_string())?;
        remove_dir(conversation_path).map_err(|e| e.to_string())?;
        Self::emit_event(
            app_handle,
            GlobalAppState::MESSAGES,
            Value::Messages(self.messages.clone())
        );
        Ok(())
    }

    pub fn load_conversation_messages(
        &mut self,
        conversation_id: &str,
        path: &PathBuf,
        cache: bool,
        app_handle: Option<AppHandle>
    ) -> Result<Vec<Message>, String> {
        let conversation_path = &Self::create_conversation_path(conversation_id, path);
        let conversation_file = conversation_path.join("messages.json");
        let messages: Vec<Message>;
        if conversation_file.exists() {
            let default_config_data = read_to_string(conversation_file).map_err(|e| e.to_string())?;
            messages = serde_json::from_str(&default_config_data).map_err(|e| e.to_string())?;
        } else {
            messages = Vec::new();
        }

        if cache {
            self.messages.insert(conversation_id.to_string(), messages.clone());
            if let Some(app_handle) = app_handle {
                Self::emit_event(
                    app_handle,
                    GlobalAppState::CONVERSATIONMESSAGES,
                    Value::ConversationMessages(ValueConversationMessages {
                        conversation_id: conversation_id.to_string(),
                        messages: Some(messages.clone()),
                    })
                );
            }
        }

        Ok(messages)
    }

    pub fn import_conversation_messages(path: &PathBuf) -> Result<Vec<Message>, String> {
        let default_config_data = read_to_string(path).map_err(|e| e.to_string())?;
        let messages: Vec<Message> = serde_json
            ::from_str(&default_config_data)
            .map_err(|e| e.to_string())?;
        Ok(messages)
    }

    pub fn save_conversation_messages(
        conversation_id: &str,
        path: &PathBuf,
        messages: Vec<Message>
    ) -> Result<(), String> {
        let conversation_path = &Self::create_conversation_path(conversation_id, path);
        let conversation_file = conversation_path.join("messages.json");
        create_dir_all(conversation_path).map_err(|e| e.to_string())?;
        println!(
            "save_conversation_messages {}: {:?} {:?}",
            conversation_id,
            conversation_file,
            conversation_path
        );
        let json = serde_json::to_string_pretty(&messages).map_err(|e| e.to_string())?;
        write(conversation_file, json).map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn update_conversation_messages(
        &mut self,
        conversation_id: &str,
        path: &PathBuf,
        messages: Vec<Message>,
        app_handle: AppHandle
    ) -> Result<(), String> {
        self.messages.insert(conversation_id.to_string(), messages.clone());
        Self::emit_event(
            app_handle,
            GlobalAppState::CONVERSATIONMESSAGES,
            Value::ConversationMessages(ValueConversationMessages {
                conversation_id: conversation_id.to_string(),
                messages: Some(messages.clone()),
            })
        );
        Self::save_conversation_messages(conversation_id, path, messages)
    }

    pub fn create_conversation_path(conversation_id: &str, path: &PathBuf) -> PathBuf {
        path.join(format!(".opla/conversations_storage/{}", conversation_id))
    }

    pub fn create_threads_path(name: &str, path: &PathBuf) -> PathBuf {
        path.join(format!(".opla/{}.json", name))
    }

    pub fn load_threads(path: &PathBuf) -> Result<Vec<Conversation>, String> {
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
            match Self::load_threads(&conversations_path) {
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
        match Self::load_threads(&previous_conversations_path) {
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
                println!(
                    "Error Loading previous {}: {:?} {:?}",
                    name,
                    error,
                    previous_conversations_path
                );
                return;
            }
        }
        // Remove previous format {name}.json
        if let Err(error) = remove_file(previous_conversations_path) {
            println!("Error Removing previous {}: {:?}", name, error);
        }
    }

    pub async fn init_conversation(conversation_id: String, project_path: &PathBuf) {
        println!("Init conversation {} {:?}", conversation_id, project_path);
        let conversations_path = &Self::create_conversation_path(&conversation_id, &project_path);
        if conversations_path.exists() {
            return;
        }

        // Otherwise import previous format
        let previous_conversations_path = match get_data_directory() {
            Ok(path) => path.join(format!("{}/messages.json", conversation_id)),
            Err(_) => {
                return;
            }
        };
        if !previous_conversations_path.exists() {
            return;
        }

        match Self::import_conversation_messages(&previous_conversations_path) {
            Ok(mut messages) => {
                for message in messages.iter_mut() {
                    message.sanitize_metadata();
                }
                println!("Loaded {} messages: ", conversation_id);
                if
                    let Err(error) = Self::save_conversation_messages(
                        &conversation_id,
                        &project_path,
                        messages
                    )
                {
                    println!("Error converting messages {}: {:?}", conversation_id, error);
                    return;
                }
            }
            Err(error) => {
                println!(
                    "Error Loading previous messages {}: {:?} {:?}",
                    conversation_id,
                    error,
                    previous_conversations_path
                );
                return;
            }
        }

        // TODO Remove previous format conversation messages
    }

    pub async fn init_conversations(&mut self, project_path: &PathBuf) {
        for conversation in &self.conversations {
            Self::init_conversation(conversation.id.to_string(), project_path).await;
        }
    }

    pub async fn init(&mut self, app_handle: AppHandle, project_path: PathBuf) {
        self.subscribe_state_events(app_handle.app_handle());

        self.init_threads("conversations", project_path.clone()).await;

        self.init_conversations(&project_path).await;

        self.init_threads("archives", project_path).await;
    }
}
