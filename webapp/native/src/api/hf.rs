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

use std::str::FromStr;

use chrono::{ DateTime, Utc };
use serde::{ self, Deserialize, Serialize };
use crate::data::option_date_format;
use crate::data::model::Model;
use crate::data::{ Entity, Resource };

use super::models::ModelsCollection;

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct HFConfig {
    pub model_type: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct HFSibling {
    #[serde(rename = "rfilename")]
    pub r_filename: Option<String>,
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct HFModel {
    pub id: String,
    pub author: Option<String>,
    #[serde(
        rename = "lastModified",
        with = "option_date_format",
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub last_modified: Option<DateTime<Utc>>,
    #[serde(
        rename = "createdAt",
        with = "option_date_format",
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub created_at: Option<DateTime<Utc>>,
    pub sha: Option<String>,
    pub tags: Vec<String>,
    pub config: Option<HFConfig>,
    pub siblings: Option<Vec<HFSibling>>,
}

impl HFModel {
    pub fn to_model(&self) -> Model {
        let name = match self.id.split('/').last() {
            Some(name) => name.to_string(),
            None => self.id.clone(),
        };
        let mut model = Model::new(name);
        model.id = Some(self.id.clone());
        model.created_at = self.created_at.clone();
        model.updated_at = self.last_modified.clone();
        model.author = match &self.author {
            Some(author) =>
                match Entity::from_str(&author) {
                    Ok(entity) => Some(entity),
                    Err(_) => None,
                }
            None => None,
        };

        model.include = match &self.siblings {
            Some(siblings) => {
                let mut include = Vec::new();
                let url = "https://huggingface.co/".to_string() + &self.id + "/resolve/main/";
                for sibling in siblings {
                    let r_filename = match &sibling.r_filename {
                        Some(r_filename) => r_filename,
                        None => {
                            continue;
                        }
                    };
                    let mut submodel = Model::new(r_filename.clone());
                    let filename = url.clone() + r_filename;
                    submodel.download = match Resource::from_str(&filename) {
                        Ok(resource) => Some(resource),
                        Err(_) => None,
                    };
                    include.push(submodel);
                }
                if include.is_empty() {
                    ();
                }
                Some(include)
            }
            None => None,
        };
        model
    }
}

pub async fn search_hf_models(query: &str) -> Result<ModelsCollection, Box<dyn std::error::Error>> {
    let url =
        format!("https://huggingface.co/api/models?search={}&filter=gguf&limit=10&full=true&config=true", query);
    let response = reqwest::get(url).await?;
    let hf_collection = response.json::<Vec<HFModel>>().await?;
    let models: Vec<Model> = hf_collection
        .iter()
        .map(|hf_model| {
            println!("hf_model: {:?}", hf_model);
            hf_model.to_model()
        })
        .collect();
    Ok(ModelsCollection { models, created_at: Utc::now(), updated_at: Utc::now() })
}
