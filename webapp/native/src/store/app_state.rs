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

use serde::{ Deserialize, Serialize };

use crate::data::{
    conversation::Conversation,
    message::{ ConversationMessages, Message },
    workspace::{ project::Project, Workspace }, Preset,
};

pub const STATE_CHANGE_EVENT: &str = "state_change_event";
pub const STATE_SYNC_EVENT: &str = "state_sync_event";
pub enum GlobalAppState {
    ACTIVE = 0,
    WORKSPACE = 1,
    ERROR = 2,
    PROJECT = 3,

    CONVERSATIONS = 4,
    DELETECONVERSATION = 5,

    ARCHIVES = 6,

    CONVERSATIONMESSAGES = 7,

    MESSAGES = 8,

    PRESETS = 9,
}

impl From<u32> for GlobalAppState {
    fn from(item: u32) -> Self {
        match item {
            0 => GlobalAppState::ACTIVE,
            1 => GlobalAppState::WORKSPACE,
            3 => GlobalAppState::PROJECT,
            4 => GlobalAppState::CONVERSATIONS,
            5 => GlobalAppState::DELETECONVERSATION,
            6 => GlobalAppState::ARCHIVES,
            7 => GlobalAppState::CONVERSATIONMESSAGES,
            8 => GlobalAppState::MESSAGES,
            9 => GlobalAppState::PRESETS,
            _ => {
                println!("Not a valid value for the enum GlobalAppState");
                GlobalAppState::ERROR
            }
        }
    }
}

impl Into<u32> for GlobalAppState {
    fn into(self) -> u32 {
        match self {
            GlobalAppState::ERROR => 2,
            GlobalAppState::ACTIVE => 0,
            GlobalAppState::WORKSPACE => 1,
            GlobalAppState::PROJECT => 3,

            GlobalAppState::CONVERSATIONS => 4,
            GlobalAppState::DELETECONVERSATION => 5,

            GlobalAppState::ARCHIVES => 6,

            GlobalAppState::CONVERSATIONMESSAGES => 7,

            GlobalAppState::MESSAGES => 8,

            GlobalAppState::PRESETS => 9,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Empty {}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ValuePresets {
    pub presets: Vec<Preset>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Value {
    Bool(bool),
    String(String),
    Number(i32),
    Workspace(Workspace),
    Project(Project),
    Presets(ValuePresets),
    Empty(Empty),
    Conversations(Vec<Conversation>),
    ConversationMessages(ConversationMessages),
    Messages(HashMap<String, Vec<Message>>),
}

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, Serialize, Deserialize)]
pub struct Payload {
    pub key: u32,
    pub value: Option<Value>,
}
