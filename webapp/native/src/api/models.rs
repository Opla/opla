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

use chrono::{ DateTime, Utc };
use serde::{ self, Deserialize, Serialize };
use crate::data::{ date_format, model::Model };

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ModelsCollection {
    #[serde(with = "date_format", alias = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "date_format", alias = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    pub models: Vec<Model>,
}

pub async fn fetch_models_collection(
    url: &str
) -> Result<ModelsCollection, Box<dyn std::error::Error>> {
    println!("Fetching models collection from {}", url);
    let response = reqwest::get(url).await?;
    let collection = response.json::<ModelsCollection>().await?;
    // println!("Fetched models collection: {:?}", collection);
    Ok(collection)
}
