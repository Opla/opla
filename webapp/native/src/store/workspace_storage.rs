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

use std::collections::HashMap;
use std::fs::create_dir_all;
use std::fs::{ read_to_string, write };
use std::path::PathBuf;
use serde::{ Deserialize, Serialize };
use tauri::Manager;
use tauri::AppHandle;
use tokio::spawn;
use uuid::Uuid;

use crate::data::workspace::project::Project;
use crate::data::workspace::Workspace;
use crate::utils::get_data_directory;
use crate::OplaContext;

use super::app_state::{ GlobalAppState, Payload, Empty, Value, STATE_CHANGE_EVENT, STATE_SYNC_EVENT };

pub const DEFAULT_PROJECT_NAME: &str = "project";
pub const DEFAULT_PROJECT_PATH: &str = "workspace/project";

pub fn get_project_path(project_path: Option<String>) -> String {
    match project_path {
        Some(path) => path,
        None => DEFAULT_PROJECT_PATH.to_string(),
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WorkspaceStorage {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub active_workspace_id: Option<String>,
    #[serde(default = "default_workspace")]
    pub workspaces: HashMap<String, Workspace>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub selected_project_id: Option<String>,
    #[serde(skip_serializing, default = "default_project")]
    pub projects: HashMap<String, Project>,
}

fn default_workspace() -> HashMap<String, Workspace> {
    HashMap::new()
}

fn default_project() -> HashMap<String, Project> {
    HashMap::new()
}

impl WorkspaceStorage {
    pub fn new() -> Self {
        Self {
            active_workspace_id: None,
            workspaces: default_workspace(),
            selected_project_id: None,
            projects: default_project(),
        }
    }

    pub fn create_workspace(&mut self) -> Workspace {
        let id = Uuid::new_v4();
        let workspace = Workspace::new(id.to_string());
        self.workspaces.insert(id.to_string(), workspace.clone());
        workspace
    }

    pub fn load_active_workspace(&mut self) -> Workspace {
        let active_workspace = match &self.active_workspace_id {
            Some(id) => { self.workspaces.get(id) }
            None => None,
        };
        match active_workspace {
            Some(w) => w.clone(),
            None => self.create_workspace(),
        }
    }

    pub fn create_project_directory(
        &mut self,
        project_path: Option<String>
    ) -> Result<String, String> {
        let project_path = match project_path {
            Some(path) => path,
            None => DEFAULT_PROJECT_PATH.to_string(),
        };
        let project_path = project_path.as_str();
        // Check if directory is existing / create one if not
        let mut path = PathBuf::new().join(project_path);
        if !path.is_absolute() {
            path = get_data_directory()?.join(project_path);
        }
        // println!("project dir={:?}", path);
        if !path.exists() {
            create_dir_all(path).map_err(|e| e.to_string())?;
        } else if !path.is_dir() {
            return Err(format!("Not a directory: {:?}", project_path));
        }
        Ok(project_path.to_string())
    }

    pub fn get_project_directory(
        &mut self,
        project_path: Option<String>
    ) -> Result<PathBuf, String> {
        let project_path = match project_path {
            Some(path) => path,
            None => DEFAULT_PROJECT_PATH.to_string(),
        };
        let project_path = project_path.as_str();
        // Check if directory is existing / create one if not
        let mut path = PathBuf::new().join(project_path);
        if !path.is_absolute() {
            path = get_data_directory()?.join(project_path);
        }
        println!("project path={:?}", path);
        if !path.exists() {
            create_dir_all(&path).map_err(|e| e.to_string())?;
        } else if !path.is_dir() {
            return Err(format!("Not a directory: {:?}", project_path));
        }
        Ok(PathBuf::new().join(&path))
    }

    pub fn load_project(
        &mut self,
        name: String,
        project_path: Option<String>,
        workspace_id: String
    ) -> Result<Project, String> {
        let path = self.get_project_directory(project_path.clone())?;
        let path = &PathBuf::new().join(path.clone()).join(".opla/settings.json");
        let project: Project;

        if path.exists() {
            // println!("load project path={:?}", path);
            let default_config_data = read_to_string(path).map_err(|e| e.to_string())?;
            project = serde_json::from_str(&default_config_data).map_err(|e| e.to_string())?;
        } else {
            let prefix = path.parent().unwrap();
            // println!("create project prefix path={:?}", prefix);
            create_dir_all(prefix).map_err(|e| e.to_string())?;
            project = Project::new(name, get_project_path(project_path), workspace_id.to_string());
        }
        Ok(project)
    }

    pub fn save_project(&mut self, project: &Project) -> Result<(), String> {
        let path = self.get_project_directory(Some(project.path.clone()))?;
        let project_path = &PathBuf::new().join(path.clone()).join(".opla/settings.json");
        let prefix = project_path.parent().unwrap();
        create_dir_all(prefix).map_err(|e| e.to_string())?;
        println!("save project {:?} {:?}", project_path, prefix);
        let json = serde_json::to_string_pretty(project).map_err(|e| e.to_string())?;
        write(project_path, json).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn create_project(&mut self) -> Result<Project, String> {
        let active_workspace = self.load_active_workspace();
        let id = active_workspace.id;
        let path = self.create_project_directory(None)?;
        let project = self.load_project(
            DEFAULT_PROJECT_NAME.to_string(),
            Some(path),
            id.to_string()
        )?;
        self.active_workspace_id = Some(id);
        Ok(project)
    }

    pub fn get_selected_project(&mut self) -> Result<Project, String> {
        let selected_project_id = self.selected_project_id
            .clone()
            .unwrap_or(DEFAULT_PROJECT_NAME.to_string());
        let project = match self.projects.get(&selected_project_id) {
            Some(p) => p.clone(),
            None => {
                let project = self.create_project()?;
                project.clone()
            }
        };
        Ok(project)
    }

    async fn emit_state_async(payload: Payload, app_handle: AppHandle) {
        let context = app_handle.state::<OplaContext>();
        let value = match payload.value {
            Some(v) => v,
            None => Value::Empty(Empty {}),
        };
        println!("Emit state sync: {} {:?}", payload.key, value);
        match GlobalAppState::from(payload.key) {
            GlobalAppState::ACTIVE => {
                if let Value::String(data) = value {
                    let mut store = context.store.lock().await;
                    println!("Set active workspace {:?}", data);
                    store.workspaces.active_workspace_id = Some(data.to_string());
                    app_handle
                        .emit_all(STATE_SYNC_EVENT, Payload {
                            key: payload.key,
                            value: Some(Value::String(data)),
                        })
                        .unwrap();
                    let _ = store.save().map_err(|err| err.to_string());
                } else {
                    let mut store = context.store.lock().await;
                    let id = match &store.workspaces.active_workspace_id {
                        Some(id) => id.to_string(),
                        None => {
                            let workspace = &store.workspaces.create_workspace();
                            store.workspaces.active_workspace_id = Some(workspace.id.to_string());
                            let _ = store.save().map_err(|err| err.to_string());
                            println!("create active workspace {:?}", workspace.id.to_string());
                            workspace.id.to_string()
                        }
                    };
                    app_handle
                        .emit_all(STATE_SYNC_EVENT, Payload {
                            key: payload.key,
                            value: Some(Value::String(id)),
                        })
                        .unwrap();
                }
            }
            GlobalAppState::WORKSPACE => {
                if let Value::Workspace(data) = value {
                    let mut store = context.store.lock().await;

                    let id = data.id.clone();
                    store.workspaces.workspaces.insert(id, data.clone());
                    let _ = store.save().map_err(|err| err.to_string());
                    app_handle
                        .emit_all(STATE_SYNC_EVENT, Payload {
                            key: payload.key,
                            value: Some(Value::Workspace(data)),
                        })
                        .unwrap();
                } else {
                    println!("TODO create a workspace");
                }
            }
            GlobalAppState::PROJECT => {
                let project: Project;
                let mut store = context.store.lock().await;

                if let Value::Project(data) = value {
                    project = data.clone();
                } else {
                    project = match store.workspaces.create_project() {
                        Ok(p) => p,
                        Err(error) => {
                            println!("project get error: {:?}", error);
                            app_handle
                                .emit_all(STATE_SYNC_EVENT, Payload {
                                    key: GlobalAppState::ERROR.into(),
                                    value: Some(Value::String(error)),
                                })
                                .unwrap();
                            return;
                        }
                    };
                    /* let active_workspace = store.workspaces.load_active_workspace();
                    let id = active_workspace.id;
                    let path = store.workspaces.create_project_directory(None);
                    match path {
                        Ok(path) => {
                            project = match
                                store.workspaces.load_project(
                                    DEFAULT_PROJECT_NAME.to_string(),
                                    Some(path),
                                    id.to_string()
                                )
                            {
                                Ok(p) => p,
                                Err(error) => {
                                    println!("project load error: {:?}", error);
                                    app_handle
                                        .emit_all(STATE_SYNC_EVENT, Payload {
                                            key: GlobalAppStateWorkspace::ERROR.into(),
                                            value: Some(Value::String(error)),
                                        })
                                        .unwrap();
                                    return;
                                }
                            };
                            store.workspaces.active_workspace_id = Some(id);
                        }
                        Err(error) => {
                            println!("project dir error: {:?}", error);
                            app_handle
                                .emit_all(STATE_SYNC_EVENT, Payload {
                                    key: GlobalAppStateWorkspace::ERROR.into(),
                                    value: Some(Value::String(error)),
                                })
                                .unwrap();
                            return;
                        }
                    } */
                }
                println!("project {:?}", project);
                let id = project.id.clone();
                store.workspaces.projects.insert(id, project.clone());
                match store.workspaces.save_project(&project) {
                    Ok(_) => (),
                    Err(error) => {
                        println!("project save error: {:?}", error);
                        app_handle
                            .emit_all(STATE_SYNC_EVENT, Payload {
                                key: GlobalAppState::ERROR.into(),
                                value: Some(Value::String(error)),
                            })
                            .unwrap();
                        return;
                    }
                }
                let _ = store.save().map_err(|err| err.to_string());
                app_handle
                    .emit_all(STATE_SYNC_EVENT, Payload {
                        key: payload.key,
                        value: Some(Value::Project(project)),
                    })
                    .unwrap();
            }
            GlobalAppState::ERROR => {
                println!("Not a valid state");
            }
            _ => {
                // Others do nothing
            }
        }
    }

    pub fn subscribe_state_events(&mut self, app_handle: AppHandle) {
        let app_handle_copy = app_handle.app_handle();
        let _id = app_handle.listen_global(STATE_CHANGE_EVENT, move |event| {
            if let Some(payload) = event.payload() {
                let data: Result<Payload, _> = serde_json::from_str(payload);
                match data {
                    Ok(data) => {
                        println!("before spawn");
                        let app_handle = app_handle_copy.app_handle();
                        spawn(async move {
                            WorkspaceStorage::emit_state_async(data, app_handle).await
                        });
                    }
                    Err(e) => {
                        println!("Failed to deserialize payload: {}", e);
                    }
                }
            }
        });
    }

    pub fn init(&mut self, app_handle: AppHandle) {
        self.subscribe_state_events(app_handle);
    }
}
