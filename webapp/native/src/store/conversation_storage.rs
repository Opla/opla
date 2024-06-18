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

use std::{collections::HashMap, fs::read_to_string};
use std::path::PathBuf;
use serde::{ Deserialize, Serialize };
use tauri::{ AppHandle, Manager };
use tokio::spawn;

use crate::{
    data::{ conversation::Conversation, message::Message },
    utils::get_data_directory,
};

use super::app_state::{ Payload, STATE_CHANGE_EVENT };


#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ConversationStorage {
    pub conversations: Vec<Conversation>,
    pub messages: HashMap<String, Vec<Message>>,
    pub archives: Vec<Conversation>,
}

impl ConversationStorage {
    pub fn new() -> Self {
        Self {
            conversations: Vec::new(),
            messages: HashMap::new(),
            archives: Vec::new(),
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
                            // TODO
                            // WorkspaceStorage::emit_state_async(data, app_handle).await
                        });
                    }
                    Err(e) => {
                        println!("Failed to deserialize payload: {}", e);
                    }
                }
            }
        });
    }

    pub fn load_conversations(&mut self, path: &PathBuf) -> Result<Vec<Conversation>, String> {
        let default_config_data = read_to_string(path).map_err(|e| e.to_string())?;
        let conversations: Vec<Conversation> = serde_json
            ::from_str(&default_config_data)
            .map_err(|e| e.to_string())?;
        Ok(conversations)
    }

    pub async fn init(&mut self, app_handle: AppHandle, project_path: PathBuf) {
        self.subscribe_state_events(app_handle.app_handle());
        let project_path = project_path.join(".opla/conversations.json");
        if project_path.exists() {
            match self.load_conversations(&project_path) {
            Ok(conversations) => {
                println!("Loaded project's conversations: {:?}", conversations);
                self.conversations = conversations;
            },
            Err(error) => {
                println!("Error Loading project's conversations: {:?} {:?}", error, project_path);
            },
        };
            return;
        }
        let path = match get_data_directory() {
            Ok(path) => path.join("conversations.json"),
            Err(_) => {
                return;
            }
        };
        match self.load_conversations(&path) {
            Ok(conversations) => {
                println!("Loaded conversations: {:?}", conversations);
                self.conversations = conversations;
            },
            Err(error) => {
                println!("Error Loading conversations: {:?} {:?}", error, path);
            },
        };
    }
}
