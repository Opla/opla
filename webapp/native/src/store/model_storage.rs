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

use std::fs::create_dir_all;
use std::path::{ Path, PathBuf };
use opla_core::gguf::GGUF;
use serde::{ self, Deserialize, Serialize };
use uuid::Uuid;
use crate::data::model::{ Model, ModelEntity };
use crate::utils::{ get_home_directory, get_data_directory };

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelStorage {
    pub path: Option<String>,
    pub items: Vec<ModelEntity>,
}

impl ModelStorage {
    pub fn new() -> Self {
        ModelStorage {
            path: None,
            items: vec![],
        }
    }

    pub fn get_models_path(&self) -> Result<PathBuf, String> {
        Ok(get_data_directory()?.join("models"))
    }

    pub fn get_full_path(
        &self,
        filepath: String,
        filename: Option<String>
    ) -> Result<PathBuf, String> {
        let path_filename = Path::new(&filepath).join(&filename.unwrap_or("".to_string()));
        if path_filename.is_absolute() {
            return Ok(path_filename.to_path_buf());
        }
        let models_path = match self.path {
            Some(ref path) => {
                let p = PathBuf::from(path);
                if p.is_absolute() {
                    p
                } else {
                    get_home_directory()?.join(path)
                }
            }
            None => self.get_models_path()?,
        };
        let model_path = models_path.join(path_filename);
        Ok(model_path)
    }

    pub fn create_model_path_filename(
        &self,
        path: String,
        file_name: String
    ) -> Result<String, String> {
        let models_path = self.get_full_path(path, None)?;
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
        let models_path = self.get_full_path(path, None)?;
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

    fn get_path(&self, id_or_name: String) -> Result<String, String> {
        let (file_name, path) = match self.get_model_entity(&id_or_name) {
            Some(model) => (model.file_name.clone(), model.path.clone()),
            None => {
                return Err(format!("get_path Model not found: {:?}", id_or_name));
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
        let model_path = match self.get_model_path_filename(path, file_name) {
            Ok(p) => p,
            Err(err) => {
                return Err(err);
            }
        };

        Ok(model_path)
    }

    pub fn get_model_path(&self, id_or_name: String) -> Result<String, String> {
        let model_path = self.get_path(id_or_name)?;

        let mut gguf = opla_core::gguf::GGUF::new(&model_path);
        match gguf.read(&model_path) {
            Ok(_) => {}
            Err(err) => {
                return Err(err);
            }
        }

        Ok(model_path)
    }

    pub fn get_model_file(&self, id_or_name: String) -> Result<GGUF, String> {
        let model_path = self.get_path(id_or_name)?;

        let mut gguf = GGUF::new(&model_path);
        match gguf.read(&model_path) {
            Ok(_) => {}
            Err(err) => {
                return Err(err);
            }
        }

        Ok(gguf)
    }

    pub fn validate_model(&self, model: &Model) -> Result<(), String> {
        if model.id.is_none() {
            return Err("Model ID is required".to_string());
        }
        if model.name.is_empty() {
            return Err("Model name is required".to_string());
        }
        Ok(())
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

    pub fn create_model(
        &mut self,
        model: Model,
        state: Option<String>,
        path: Option<String>,
        file_name: Option<String>
    ) -> (ModelEntity, String) {
        let mut model = model.clone();
        model.base_model = model.id;
        let uuid = Uuid::new_v4().to_string();
        model.id = Some(uuid.clone());

        (
            ModelEntity {
                reference: model,
                state,
                path,
                file_name,
            },
            uuid,
        )
    }

    pub fn add_model(&mut self, model: ModelEntity) {
        self.items.push(model.clone());
    }

    pub fn remove_model(&mut self, id: &str, in_use: bool) -> Option<ModelEntity> {
        if in_use {
            println!("remove_model: {:?} in_use", id);
            let mut model = match self.get_model_entity(id) {
                Some(model) => model,
                None => {
                    return None;
                }
            };
            model.state = Some("removed".to_string());
            self.update_model_entity(&model);
            return Some(model);
        }
        println!("remove_model delete: {:?}", id);
        self.items
            .iter()
            .position(|m| m.reference.is_same_id_or_name(id))
            .map(|index| self.items.remove(index))
    }

    pub fn update_model(&mut self, model: Model) {
        if let Some(index) = self.items.iter().position(|m| m.reference.is_same_model(&model)) {
            let mut model_entity = match self.items.get(index) {
                Some(model_entity) => model_entity.clone(),
                None => {
                    return;
                }
            };
            model_entity.reference = model;
            self.items.remove(index);
            self.items.insert(index, model_entity.clone());
        }
    }

    pub fn update_model_entity(&mut self, model_entity: &ModelEntity) {
        if
            let Some(index) = self.items
                .iter()
                .position(|m| m.reference.is_same_model(&model_entity.reference))
        {
            self.items.remove(index);
            self.items.insert(index, model_entity.clone());
        }
    }

    pub fn set_model_state(&mut self, model_id: &str, state: &str) {
        let mut model_entity = match self.get_model_entity(model_id) {
            Some(model_entity) => model_entity,
            None => {
                return;
            }
        };
        model_entity.state = Some(state.to_string());
        self.update_model_entity(&model_entity);
    }
}
