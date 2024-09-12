// Copyright 2023 Mik Bry
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
use tauri::{ AppHandle, Manager };
use tokio::spawn;

use crate::{
    store::app_state::{
        Empty,
        GlobalAppState,
        EventPayload,
        Value,
        ValueSettings,
        STATE_SYNC_EVENT,
    },
    OplaContext,
    data::option_f32_or_u32,
};
use super::app_state::STATE_CHANGE_EVENT;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WindowSettings {
    pub width: u32,
    pub height: u32,
    pub fullscreen: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExplorerGroup {
    pub title: String,
    pub hidden: bool,
    pub height: f64,
    pub closed: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ViewSettings {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub selected_id: Option<String>,
    pub explorer_hidden: bool,
    pub settings_hidden: bool,
    pub explorer_width: f64,
    pub settings_width: f64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub explorer_groups: Option<Vec<ExplorerGroup>>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_f32_or_u32"
    )]
    pub scroll_position: Option<u32>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PageSettings {
    #[serde(flatten)]
    pub settings: ViewSettings,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub views: Option<Vec<ViewSettings>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Settings {
    pub start_app: bool,
    pub welcome_splash: bool,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub window: Option<WindowSettings>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub selected_page: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub pages: Option<HashMap<String, PageSettings>>,
}

impl Settings {
    async fn emit_state_async(payload: EventPayload, app_handle: AppHandle) {
        let context = app_handle.state::<OplaContext>();
        let value = match payload.value {
            Some(v) => v,
            None => Value::Empty(Empty {}),
        };
        println!("Settings emit state sync: {} {:?}", payload.key, value);
        match GlobalAppState::from(payload.key) {
            GlobalAppState::SETTINGS => {
                let mut store = context.store.lock().await;
                if let Value::Settings(data) = value {
                    store.settings = data.settings.clone();
                    if let Err(error) = store.save() {
                        println!("Error can't save settings store: {:?}", error);
                    }
                } else if let Value::Empty(_) = value {
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                    return;
                }

                app_handle
                    .emit_all(STATE_SYNC_EVENT, EventPayload {
                        key: payload.key,
                        value: Some(
                            Value::Settings(ValueSettings {
                                settings: store.settings.clone(),
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

    pub fn init(&mut self, app_handle: AppHandle) {
        self.subscribe_state_events(app_handle.app_handle());
    }
}
