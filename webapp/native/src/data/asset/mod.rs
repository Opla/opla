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

use std::{ fs, path::Path };

use serde::{ Deserialize, Serialize };
use serde_with::serde_as;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AssetState {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "downlading")]
    Downloading,
    #[serde(rename = "ok")]
    Ok,
    #[serde(rename = "error")]
    Error,
}

#[derive(PartialEq, Clone, Debug, Serialize, Deserialize)]
pub enum AssetType {
    #[serde(rename = "link")]
    Link,
    #[serde(rename = "file")]
    File,
}

#[serde_as]
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Asset {
    pub id: String,
    // #[serde(with = "option_date_format", skip_serializing_if = "Option::is_none", default)]
    pub created_at: i64, // Option<DateTime<Utc>>,
    // #[serde(with = "option_date_format", skip_serializing_if = "Option::is_none", default)]
    pub updated_at: i64, // Option<DateTime<Utc>>,
    pub r#type: AssetType,
    pub state: AssetState,
    pub tokens_count: Option<u32>,
    pub file: Option<String>,
    pub size: Option<u64>,
}

const EXTENSIONS: &'static [&'static str] = &["pdf", "txt", "csv", "md", "json"];

impl Asset {
    pub fn extensions() -> &'static [&'static str] {
        EXTENSIONS
    }

    pub fn validate(&mut self) {
        if self.r#type == AssetType::File && self.file.is_some() {
            let file = match &self.file {
                Some(f) => f,
                None => {
                    self.state = AssetState::Error;
                    return;
                }
            };
            let path = Path::new(&file);
            if path.is_file() {
                let extension = path.extension().unwrap_or_default().to_ascii_lowercase();
                let metadata = path.metadata();
                println!("Validate {} ext={:?} metadata={:?}", file, extension, metadata);
                match metadata {
                    Ok(m) => {
                        let len = m.len();
                        if len > 200000 {
                            println!("Error file too big");
                            self.state = AssetState::Error;
                            return;
                        }
                        self.size = Some(m.len());
                        if extension != "pdf" {
                            let content = match fs::read_to_string(path) {
                                Ok(c) => { c }
                                Err(err) => {
                                    println!("Error reading file {:?}", err);
                                    self.state = AssetState::Error;
                                    return;
                                }
                            };
                            self.state = AssetState::Ok;
                            // Choose tokenizer based on activeModel
                            let tokens = tokenizer::encode(content, "gpt".to_string(), None);
                            self.tokens_count = match tokens {
                                Ok(t) => { Some(t.len().try_into().unwrap_or(0)) }
                                Err(err) => {
                                    println!("Error tokenize file {:?}", err);
                                    self.state = AssetState::Error;
                                    None
                                }
                            };
                        } else {
                            // TODO Parsing
                            self.state = AssetState::Error;
                        }
                    }
                    Err(err) => {
                        println!("Error reading file metadata {:?}", err);
                        self.state = AssetState::Error;
                        return;
                    }
                }
                println!("Validated asset: {:?}", self);
            }
        } else {
            self.state = AssetState::Error;
        }
    }
}
