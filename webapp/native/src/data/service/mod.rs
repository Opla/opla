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
    pub r#type: ServiceType,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub model_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub provider_id_or_name: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub assistant_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub target_id: Option<String>,

    pub disabled: bool,
}

impl Service {
    pub fn new(r#type: ServiceType) -> Self {
        Self {
            r#type,
            model_id: None,
            provider_id_or_name: None,
            assistant_id: None,
            target_id: None,
            disabled: false,
        }
    }
    pub fn get_model_id(&self) -> Option<String> {
        match self.r#type {
            ServiceType::Model => self.model_id.clone(),
            _ => None,
        }
    }
    pub fn get_provider_id(&self) -> Option<String> {
        match self.r#type {
            ServiceType::Model => self.provider_id_or_name.clone(),
            _ => None,
        }
    }
}
