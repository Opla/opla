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
use uuid::Uuid;
use void::Void;
use crate::utils::{ get_home_directory, get_data_directory };
use crate::data::{ option_date_format, option_string_or_struct };

// See https://serde.rs/string-or-struct.html
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Entity {
    pub name: String,
    pub email: Option<String>,
    pub url: Option<String>,
}
impl FromStr for Entity {
    type Err = Void;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Entity {
            name: s.to_string(),
            email: None,
            url: None,
        })
    }
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Resource {
    pub url: String,
    pub name: Option<String>,
    // TODO handle filename
}

impl FromStr for Resource {
    type Err = Void;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        // TODO check if s is a valid URL or a file path
        Ok(Resource {
            url: s.to_string(),
            name: None,
        })
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

    pub include: Option<Vec<Model>>,
}

impl Model {
    pub fn is_same_id(&self, id: &str) -> bool {
        self.id.is_some() && self.id.as_deref().unwrap() == id
    }
    pub fn is_same_model(&self, another_model: &Model) -> bool {
        self.id.is_some() & another_model.id.is_some() && self.id == another_model.id
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

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelStorage {
    pub path: Option<String>,
    pub default_model: Option<String>,
    pub items: Vec<ModelEntity>,
}

impl ModelStorage {
    pub fn new() -> Self {
        ModelStorage {
            path: None,
            default_model: None,
            items: vec![],
        }
    }

    pub fn get_model_path(&self, file_name: String, path: String) -> String {
        let mut models_path = get_data_directory().expect("Failed to get data directory");
        print!("models_path: {:?}", self.path);
        if self.path.is_some() {
            let home_dir = get_home_directory().expect("Failed to get home directory");
            models_path = home_dir.join(self.path.as_deref().unwrap());
        } else {
            models_path = models_path.join("models".to_string());
        }

        let model_path = models_path.join(path).join(file_name);
        model_path.to_str().unwrap().to_string()
    }

    pub fn get_model(&self, id: &str) -> Option<Model> {
        self.items
            .iter()
            .find(|m| m.reference.is_same_id(id))
            .map(|m| m.reference.clone())
    }

    pub fn add_model(
        &mut self,
        model: Model,
        state: Option<String>,
        path: Option<String>,
        file_name: Option<String>
    ) -> String {
        let mut model = model.clone();
        model.base_model = model.id;
        let uuid = Uuid::new_v4().to_string();
        model.id = Some(uuid.clone());
        self.items.push(ModelEntity {
            reference: model,
            state,
            path,
            file_name,
        });
        uuid
    }

    pub fn remove_model(&mut self, id: &str) {
        self.items.retain(|m| !m.reference.is_same_id(id));
    }

    pub fn update_model(&mut self, model: ModelEntity) {
        if
            let Some(index) = self.items
                .iter()
                .position(|m| m.reference.is_same_model(&model.reference))
        {
            self.items.remove(index);
            self.items.insert(index, model);
        }
    }
}
