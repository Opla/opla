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

pub mod project;

#[serde_as]
#[serde_with::skip_serializing_none]
#[derive(Debug, Deserialize, Serialize)]
pub struct Workspace {
    pub id: String,
    pub name: Option<String>,
    pub organization_id_or_name: Option<String>,
    pub projects_path: Vec<String>,
}

impl Workspace {
    pub fn new(id: String) -> Self {
        Self {
            id,
            name: None,
            organization_id_or_name: None,
            projects_path: Vec::new(),
        }
    }
}
impl Clone for Workspace {
    fn clone(&self) -> Workspace {
        Workspace {
            id: self.id.clone(),
            name: self.name.clone(),
            organization_id_or_name: self.organization_id_or_name.clone(),
            projects_path: self.projects_path.clone(),
        }
    }
}
