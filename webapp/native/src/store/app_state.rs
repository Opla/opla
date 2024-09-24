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

use std::{collections::HashMap, fmt};

use serde::{ Deserialize, Serialize };

use crate::data::{
    assistant::Assistant,
    conversation::Conversation,
    message::Message,
    provider::Provider,
    workspace::{ project::Project, Workspace },
    Preset,
};

use super::{
    model::ModelStorage,
    server::ServerStorage,
    service::ServiceStorage,
    settings::Settings,
};

// pub const STATE_CHANGE_EVENT: &str = "state_change_event";

pub enum StateEvent {
    ASSISTANT = 0,
    MODEL = 1,
    PRESET = 2,
    PROVIDER = 3,
    SERVER = 4,
    SERVICE = 5,
    SETTINGS = 6,
    THREAD = 7,
    WORKSPACE = 8,
}

impl fmt::Display for StateEvent {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            StateEvent::ASSISTANT => write!(f, "event_assistant_state_change"),
            StateEvent::MODEL => write!(f, "event_model_state_change"),
            StateEvent::PRESET => write!(f, "event_preset_state_change"),
            StateEvent::PROVIDER => write!(f, "event_provider_state_change"),
            StateEvent::SERVER => write!(f, "event_server_state_change"),
            StateEvent::SERVICE => write!(f, "event_service_state_change"),
            StateEvent::SETTINGS => write!(f, "event_settings_state_change"),
            StateEvent::THREAD => write!(f, "event_thread_state_change"),
            StateEvent::WORKSPACE => write!(f, "event_workspace_state_change"),
        }
    }
}

pub const STATE_SYNC_EVENT: &str = "state_sync_event";
pub enum GlobalAppState {
    ACTIVE = 0,
    WORKSPACE = 1,
    ERROR = 2,
    PROJECT = 3,

    ALLCONVERSATIONS = 15,
    CONVERSATIONS = 4,
    DELETECONVERSATION = 5,

    ARCHIVES = 6,

    CONVERSATIONMESSAGES = 7,

    MESSAGES = 8,

    PRESETS = 9,

    PROVIDERS = 10,

    ASSISTANTS = 11,

    SETTINGS = 12,

    SERVICES = 13,

    MODELS = 14,

    SERVER = 16,
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
            10 => GlobalAppState::PROVIDERS,
            11 => GlobalAppState::ASSISTANTS,
            12 => GlobalAppState::SETTINGS,
            13 => GlobalAppState::SERVICES,
            14 => GlobalAppState::MODELS,
            15 => GlobalAppState::ALLCONVERSATIONS,
            16 => GlobalAppState::SERVER,
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

            GlobalAppState::ALLCONVERSATIONS => 15,
            GlobalAppState::CONVERSATIONS => 4,
            GlobalAppState::DELETECONVERSATION => 5,

            GlobalAppState::ARCHIVES => 6,

            GlobalAppState::CONVERSATIONMESSAGES => 7,

            GlobalAppState::MESSAGES => 8,

            GlobalAppState::PRESETS => 9,

            GlobalAppState::PROVIDERS => 10,

            GlobalAppState::ASSISTANTS => 11,

            GlobalAppState::SETTINGS => 12,

            GlobalAppState::SERVICES => 13,

            GlobalAppState::MODELS => 14,

            GlobalAppState::SERVER => 16,
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
pub struct ValueProviders {
    pub providers: Vec<Provider>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ValueAssistants {
    pub assistants: Vec<Assistant>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ValueSettings {
    pub settings: Settings,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ValueServices {
    pub services: ServiceStorage,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ValueModels {
    pub models: ModelStorage,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ValueAllConversations {
    pub conversations: Vec<Conversation>,
    pub archives: Vec<Conversation>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ValueConversations {
    pub conversations: Vec<Conversation>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ValueConversationMessages {
    pub conversation_id: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub messages: Option<Vec<Message>>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ValueServer {
    pub server: ServerStorage,
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
    Providers(ValueProviders),
    Assistants(ValueAssistants),
    Settings(ValueSettings),
    Services(ValueServices),
    Models(ValueModels),
    AllConversations(ValueAllConversations),
    ConversationMessages(ValueConversationMessages),
    Conversations(ValueConversations),
    Server(ValueServer),
    Empty(Empty),
    Messages(HashMap<String, Vec<Message>>),
}

#[derive(Clone, Serialize, Deserialize)]
pub struct EventPayload {
    pub key: u32,
    pub value: Option<Value>,
}
