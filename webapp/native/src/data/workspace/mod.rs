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

use serde::{ self, Deserialize, Serialize };
use serde_with::serde_as;

#[serde_as]
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Project {
    pub id: Option<String>,
    pub name: Option<String>,
    pub path: Option<String>,
    pub projects: Option<String>,
}

#[serde_as]
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Workspace {
    pub id: Option<String>,
    pub name: Option<String>,
    pub organization_id_or_name: Option<String>,
    pub path: Option<String>,
    pub projects: Vec<Project>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WorkspaceStorage {
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
    )]
    pub active_workspace: Option<String>,
    pub workspaces: Vec<Workspace>,
}

impl WorkspaceStorage {
    pub fn load_active_workspace() {

    }
}