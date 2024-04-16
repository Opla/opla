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

use std::path::Path;

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
    pub r#type: AssetType,
    pub state: AssetState,
    pub tokens_count: Option<u32>,
    pub file: Option<String>,
    pub size: Option<u32>,
}

impl Asset {
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
                self.state = AssetState::Ok;
            }
        } else {
            self.state = AssetState::Error;
        }
    }
}
