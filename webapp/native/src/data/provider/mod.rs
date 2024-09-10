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

use std::fmt;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::data::option_date_format;

use super::{model::Model, Metadata};


#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ProviderType {
    #[serde(rename = "opla")]
    Opla,
    #[serde(rename = "server")]
    Server,
    #[serde(rename = "api")]
    Api,
    #[serde(rename = "proxy")]
    Proxy,
}

impl fmt::Display for ProviderType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ProviderType::Opla => write!(f, "opla"),
            ProviderType::Server => write!(f, "server"),
            ProviderType::Api => write!(f, "api"),
            ProviderType::Proxy => write!(f, "proxy"),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Provider {
    pub id: String,
    pub name: String,
    #[serde(with = "option_date_format", alias = "createdAt", skip_serializing_if = "Option::is_none", default)]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(with = "option_date_format", alias = "updatedAt", skip_serializing_if = "Option::is_none", default)]
    pub updated_at: Option<DateTime<Utc>>,

    pub r#type: String,
    #[serde(default = "default_url")]
    pub url: String,
    pub description: Option<String>,
    pub doc_url: Option<String>,
    pub key: Option<String>,
    pub disabled: Option<bool>,
    pub models: Option<Vec<Model>>,
    pub errors: Option<Vec<String>>,
    pub metadata: Option<Metadata>,
}

fn default_url() -> String {
    "http://localhost/".to_string()
}