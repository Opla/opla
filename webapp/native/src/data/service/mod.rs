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

use serde::{ self, Deserialize, Serialize };
use serde_with::serde_as;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ServiceType {
    #[serde(rename = "model")]
    Model,
    #[serde(rename = "assistant")]
    Assistant,
}

#[serde_as]
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Service {
    r#type: String,

    model_id: Option<String>,
    provider_id_or_name: Option<String>,

    assistant_id: Option<String>,
    target_id: Option<String>,
}

impl Service {
    pub fn get_active_model_id(&self) -> Option<String> {
        match self.r#type.as_str() {
            "model" => self.model_id.clone(),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServiceStorage {
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
            Some(service) => service.get_active_model_id(),
            None => None,
        }
    }

    pub fn get_active_service(&self) -> Option<&Service> {
        self.active_service.as_ref()
    }
}