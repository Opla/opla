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

use std::str::FromStr;
use chrono::{ DateTime, Utc };
use serde::{ self, Deserialize, Serialize };
use serde_with::{ serde_as, OneOrMany, formats::PreferOne };
use void::Void;
use crate::data::{ option_date_format, option_string_or_struct };

use super::{ Entity, Resource };

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Logo {
    pub url: String,
    pub name: Option<String>,
    pub color: Option<String>,
}

impl FromStr for Logo {
    type Err = Void;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        // TODO check if s is a valid URL or a file path
        if s.starts_with("http") {
            Ok(Logo {
                url: s.to_string(),
                name: None,
                color: None,
            })
        } else {
            Ok(Logo {
                url: "".to_string(),
                name: Some(s.to_string()),
                color: None,
            })
        }
    }
}

#[serde_as]
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Model {
    pub id: Option<String>,
    pub name: String,
    pub base_model: Option<String>,
    #[serde(with = "option_date_format", skip_serializing_if = "Option::is_none", default)]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(with = "option_date_format", skip_serializing_if = "Option::is_none", default)]
    pub updated_at: Option<DateTime<Utc>>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub summary: Option<String>,
    pub version: Option<String>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub icon: Option<Logo>,
    pub creator: Option<String>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub author: Option<Entity>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub publisher: Option<Entity>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub license: Option<Entity>,
    #[serde_as(deserialize_as = "Option<OneOrMany<_, PreferOne>>")]
    pub languages: Option<Vec<String>>,

    #[serde_as(deserialize_as = "Option<OneOrMany<_, PreferOne>>")]
    pub tags: Option<Vec<String>>,
    pub recommendations: Option<String>,
    pub recommended: Option<bool>,
    pub deprecated: Option<bool>,
    pub private: Option<bool>,
    pub featured: Option<bool>,

    pub model_type: Option<String>, // TODO enum
    pub library: Option<String>, // TODO enum
    pub tensor_type: Option<String>, // TODO enum
    pub quantization: Option<String>, // TODO enum
    pub bits: Option<i32>,
    pub size: Option<f32>,
    pub max_ram: Option<f32>,
    pub sha: Option<String>,
    pub file_size: Option<u64>,

    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub repository: Option<Resource>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub download: Option<Resource>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub documentation: Option<Resource>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub paper: Option<Resource>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub include: Option<Vec<Model>>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub system: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub context_window: Option<i32>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub editable: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub chat_template: Option<String>,
}

impl Model {
    pub fn new(name: String) -> Self {
        Model {
            id: None,
            name,
            base_model: None,
            created_at: None,
            updated_at: None,
            title: None,
            description: None,
            summary: None,
            version: None,
            icon: None,
            creator: None,
            author: None,
            publisher: None,
            license: None,
            languages: None,
            tags: None,
            recommendations: None,
            recommended: None,
            deprecated: None,
            private: None,
            featured: None,
            model_type: None,
            library: None,
            tensor_type: None,
            quantization: None,
            bits: None,
            size: None,
            max_ram: None,
            repository: None,
            download: None,
            documentation: None,
            paper: None,
            include: None,
            system: None,
            context_window: None,
            editable: None,
            chat_template: None,
            sha: None,
            file_size: None,
        }
    }

    pub fn is_same_id(&self, id2: &str) -> bool {
        match self.id {
            Some(ref id) => id == id2,
            None => false,
        }
    }
    pub fn is_same_id_or_name(&self, id_or_name: &str) -> bool {
        match self.id {
            Some(ref id) => id == id_or_name || self.name == id_or_name,
            None => self.name == id_or_name,
        }
    }
    pub fn is_same_model(&self, another_model: &Model) -> bool {
        self.id.is_some() & another_model.id.is_some() && self.id == another_model.id
    }

    pub fn is_some_id_or_name(&self, id_or_name: &Option<String>) -> bool {
        match id_or_name {
            Some(id_or_name) => self.is_same_id_or_name(&id_or_name),
            None => false,
        }
    }

    pub fn get_file_size(&self) -> u64 {
        return self.file_size.unwrap_or(0);
    }

    pub fn get_sha(&self) -> Option<String> {
        return self.sha.clone();
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelEntity {
    #[serde(flatten)]
    pub reference: Model,
    pub state: Option<String>,
    pub path: Option<String>,
    pub file_name: Option<String>,
}
