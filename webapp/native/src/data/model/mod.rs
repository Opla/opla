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

use std::fs::create_dir_all;
use std::path::PathBuf;
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

    pub system: Option<String>,
}

impl Model {
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
    pub active_model: Option<String>,
    pub items: Vec<ModelEntity>,
}

impl ModelStorage {
    pub fn new() -> Self {
        ModelStorage {
            path: None,
            active_model: None,
            items: vec![],
        }
    }

    fn get_path(&self, path: String) -> Result<PathBuf, String> {
        let models_path = match self.path {
            Some(ref path) => {
                let p = PathBuf::from(path);
                if p.is_absolute() {
                    p
                } else {
                    get_home_directory()?.join(path)
                }
            }
            None => get_data_directory()?.join("models"),
        };
        let model_path = models_path.join(path);
        Ok(model_path)
    }

    pub fn create_model_path_filename(
        &self,
        path: String,
        file_name: String
    ) -> Result<String, String> {
        let models_path = self.get_path(path)?;
        let result = create_dir_all(models_path.clone());
        if result.is_err() {
            return Err(format!("Failed to create model directory: {:?}", result));
        }
        let file_name = file_name.as_str();
        let binding = models_path.join(file_name);
        let model_path = match binding.to_str() {
            Some(path) => path,
            None => {
                return Err(
                    format!("Failed to create model path: {:?}/{:?}", models_path, file_name)
                );
            }
        };
        println!("model_path: {}", model_path);
        Ok(model_path.to_string())
    }

    pub fn get_model_path_filename(
        &self,
        path: String,
        file_name: String
    ) -> Result<String, String> {
        let models_path = self.get_path(path)?;
        let file_name = file_name.as_str();
        let binding = models_path.join(file_name);
        let model_path = match binding.to_str() {
            Some(path) => path,
            None => {
                return Err(
                    format!("Failed to create model path: {:?}/{:?}", models_path, file_name)
                );
            }
        };
        Ok(model_path.to_string())
    }

    pub fn get_model_entity(&self, id_or_name: &str) -> Option<ModelEntity> {
        self.items
            .iter()
            .find(|m| m.reference.is_same_id_or_name(id_or_name))
            .map(|m| m.clone())
    }

    pub fn get_model(&self, id_or_name: &str) -> Option<Model> {
        self.get_model_entity(id_or_name).map(|m| m.reference.clone())
    }

    pub fn get_model_path(&self, id_or_name: String) -> Result<String, String> {
        let (file_name, path) = match self.get_model_entity(&id_or_name) {
            Some(model) => (model.file_name.clone(), model.path.clone()),
            None => {
                return Err(format!("Model not found: {:?}", id_or_name));
            }
        };
        let path = match path {
            Some(path) => path,
            None => {
                return Err(format!("Model path not found: {:?}", id_or_name));
            }
        };
        let file_name = match file_name {
            Some(file_name) => file_name,
            None => {
                return Err(format!("Model file name not found: {:?}", id_or_name));
            }
        };
        self.get_model_path_filename(path, file_name)
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
