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

use serde::{ self, Deserialize, Serialize };
use tauri::{ AppHandle, Manager };
use tokio::spawn;

use crate::{
    data::service::Service,
    store::app_state::{ Empty, GlobalAppState, Payload, Value, STATE_SYNC_EVENT },
    OplaContext,
};

use super::app_state::STATE_CHANGE_EVENT;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServiceStorage {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub active_service: Option<Service>,
}

impl ServiceStorage {
    pub fn new() -> Self {
        Self {
            active_service: None,
        }
    }

    pub fn set_active_service(&mut self, service: Service) {
        self.active_service = Some(service);
    }

    pub fn get_active_model_id(&self) -> Option<String> {
        match &self.active_service {
            Some(service) => service.get_model_id(),
            None => None,
        }
    }

    pub fn get_active_provider_id(&self) -> Option<String> {
        match &self.active_service {
            Some(service) => service.get_provider_id(),
            None => None,
        }
    }

    pub fn get_active_service(&self) -> Option<&Service> {
        self.active_service.as_ref()
    }

    async fn emit_state_async(payload: Payload, app_handle: AppHandle) {
        let context = app_handle.state::<OplaContext>();
        let value = match payload.value {
            Some(v) => v,
            None => Value::Empty(Empty {}),
        };
        println!("Services emit state sync: {} {:?}", payload.key, value);
        match GlobalAppState::from(payload.key) {
            GlobalAppState::SERVICES => {
                let mut store = context.store.lock().await;
                if let Value::Services(data) = value {
                    store.services = data.services.clone();
                    if let Err(error) = store.save() {
                        println!("Error can't save services store: {:?}", error);
                    }
                } else if let Value::Empty(_) = value {
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                    return;
                }

                app_handle
                    .emit_all(STATE_SYNC_EVENT, Payload {
                        key: payload.key,
                        value: Some(Value::Services(crate::store::app_state::ValueServices { services: store.services.clone() })),
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
