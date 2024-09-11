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

use std::collections::HashMap;
use serde::{ Deserialize, Serialize };
use tauri::{ AppHandle, Manager, Runtime };
use tokio::spawn;

use crate::{
    data::{ Metadata, MetadataValue },
    store::app_state::{ Empty, GlobalAppState, Payload, Value, STATE_SYNC_EVENT },
    OplaContext,
};

use super::app_state::STATE_CHANGE_EVENT;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub enum ServerParameterType {
    #[serde(rename = "string")]
    String,
    #[serde(rename = "number")]
    Number,
    #[serde(rename = "integer")]
    Integer,
    #[serde(rename = "boolean")]
    Boolean,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(untagged)]
pub enum ServerParameterValue<'a> {
    String(&'a str),
    Number(f32),
    Integer(i32),
    Boolean(bool),
    None(()),
}

impl<'a> ServerParameterValue<'a> {
    pub fn to_string(&self) -> String {
        match self {
            Self::String(i) => i.to_string(),
            _ => format!("{:?}", &self),
        }
    }

    pub fn to_int(&self, default_value: i32) -> i32 {
        match self {
            Self::Integer(i) => *i,
            Self::Number(f) => *f as i32,
            _ => default_value,
        }
    }

    pub fn to_float(&self, default_value: f32) -> f32 {
        match self {
            Self::Integer(i) => *i as f32,
            Self::Number(f) => *f,
            _ => default_value,
        }
    }

    pub fn to_bool(&self, default_value: bool) -> bool {
        match self {
            Self::Boolean(v) => *v,
            _ => default_value,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ServerParameterDefinition<'a> {
    pub key: &'a str,
    pub optional: bool,
    pub r#type: ServerParameterType,
    pub default_value: ServerParameterValue<'a>,
    pub option: &'a str,
    pub long_option: &'a str,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerConfiguration {
    pub name: String,
    pub parameters: Metadata,
}

impl ServerConfiguration {
    pub fn remove_parameter(&mut self, key: &str) {
        self.parameters.remove(key);
    }

    pub fn set_parameter_string(&mut self, key: &str, value: String) {
        self.parameters.insert(key.to_string(), MetadataValue::String(value));
    }

    pub fn get_parameter_string(&self, key: &str, default_value: String) -> String {
        self.parameters
            .get(key)
            .map(|s| s.to_string())
            .unwrap_or(default_value)
    }

    pub fn get_optional_parameter_string(&self, key: &str) -> Option<String> {
        self.parameters.get(key).map(|s| s.to_string())
    }

    pub fn set_parameter_int(&mut self, key: &str, value: i32) {
        self.parameters.insert(key.to_string(), MetadataValue::Integer(value));
    }

    pub fn get_parameter_int(&self, key: &str, default_value: i32) -> i32 {
        self.parameters
            .get(key)
            .map(|s| s.to_int(default_value))
            .unwrap_or(default_value)
    }

    pub fn contains_parameter(&self, key: &str) -> bool {
        self.parameters.contains_key(key)
    }

    pub fn remove_model(&mut self) {
        self.remove_parameter("model_id");
        self.remove_parameter("model_path");
    }

    pub fn has_same_model(&self, other: &ServerConfiguration) -> bool {
        let model_id = self.get_optional_parameter_string("model_id");
        if model_id.is_some() && other.get_optional_parameter_string("model_id") == model_id {
            return true;
        }
        return false;
    }

    pub fn to_args(
        &self,
        model_path: &str,
        definitions: &phf::Map<&str, ServerParameterDefinition>
    ) -> Vec<String> {
        println!("parameters = {:?}", self.parameters);
        let mut parameters: Vec<String> = Vec::new();
        let mut is_model = false;
        for (key, value) in self.parameters.iter() {
            let definition = match definitions.get(&key) {
                Some(d) => d,
                None => {
                    if !(key == "model_path" || key == "model_id") {
                        println!("Error definition not found: {:?}", key);
                    }
                    continue;
                }
            };
            let mut option = definition.option;
            if option == "" {
                option = definition.long_option;
            }
            parameters.push(option.to_string());
            let mut validate = true;
            let mut string_value = value.to_string();
            if definition.key == "model" {
                string_value = model_path.to_string();
                is_model = true;
            } else if definition.r#type == ServerParameterType::String {
                let default_value = definition.default_value.to_string();
                validate = string_value != default_value;
            } else if definition.r#type == ServerParameterType::Number {
                let default_value = definition.default_value.to_float(0.0);
                let value = value.to_float(default_value);
                validate = value != default_value;
                string_value = value.to_string();
            } else if definition.r#type == ServerParameterType::Integer {
                let default_value = definition.default_value.to_int(0);
                let value = value.to_int(default_value);
                validate = value != default_value;
                string_value = value.to_string();
            } else if definition.r#type == ServerParameterType::Boolean {
                let default_value = definition.default_value.to_bool(false);
                validate = value.to_bool(default_value);
            }
            println!(
                "key={:?} validate={:?} sting_value={:?} {:?}",
                key,
                validate,
                string_value,
                definition.r#type
            );
            if !validate {
                parameters.pop();
            } else if definition.r#type != ServerParameterType::Boolean {
                parameters.push(string_value);
            }
        }
        if !is_model {
            let model = match self.parameters.get("model_path") {
                Some(m) => m,
                None => {
                    println!("Error model argument not found");
                    parameters.clear();
                    return parameters;
                }
            };
            let definition = match definitions.get("model") {
                Some(d) => d,
                None => {
                    println!("Error model definition not found");
                    parameters.clear();
                    return parameters;
                }
            };
            parameters.push(definition.option.to_string());
            parameters.push(model.to_string());
        }
        parameters
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerStorage {
    #[serde(default)]
    pub launch_at_startup: bool,
    pub binary: String,
    #[serde(flatten)]
    pub configuration: ServerConfiguration,
}

impl ServerStorage {
    pub fn default() -> Self {
        let mut server_parameters: Metadata = HashMap::new();
        server_parameters.insert("port".to_string(), MetadataValue::Integer(8081));
        server_parameters.insert(
            "host".to_string(),
            MetadataValue::String("127.0.0.1".to_string())
        );
        server_parameters.insert("model_id".to_string(), MetadataValue::Option(None));
        server_parameters.insert("model_path".to_string(), MetadataValue::Option(None));
        server_parameters.insert("context_size".to_string(), MetadataValue::Integer(512));
        server_parameters.insert("threads".to_string(), MetadataValue::Integer(6));
        server_parameters.insert("n_gpu_layers".to_string(), MetadataValue::Integer(0));
        ServerStorage {
            launch_at_startup: true,
            binary: String::from("binaries/llama.cpp/llama.cpp.server"),
            configuration: ServerConfiguration {
                name: String::from("llama.cpp"),
                parameters: server_parameters,
            },
        }
    }

    async fn emit_state_async(payload: Payload, app_handle: AppHandle) {
        let context = app_handle.state::<OplaContext>();
        let value = match payload.value {
            Some(v) => v,
            None => Value::Empty(Empty {}),
        };
        println!("Server emit state sync: {} {:?}", payload.key, value);
        match GlobalAppState::from(payload.key) {
            GlobalAppState::SERVER => {
                let mut store = context.store.lock().await;
                if let Value::Server(data) = value {
                    store.server = data.server.clone();
                    if let Err(error) = store.save() {
                        println!("Error can't save server store: {:?}", error);
                    }
                } else if let Value::Empty(_) = value {
                } else {
                    println!("Error wrong type of value: {} {:?}", payload.key, value);
                    return;
                }

                app_handle
                    .emit_all(STATE_SYNC_EVENT, Payload {
                        key: payload.key,
                        value: Some(
                            Value::Server(crate::store::app_state::ValueServer {
                                server: store.server.clone(),
                            })
                        ),
                    })
                    .unwrap();
            }
            _ => {}
        }
    }


    pub fn emit_update_all<R: Runtime>(&mut self, app_handle: AppHandle<R>) {
        let app_handle = app_handle.app_handle();
        let server = self.clone();
        spawn(async move { 
            // Self::emit_state_async(data, app_handle).await 
            app_handle
            .emit_all(STATE_SYNC_EVENT, Payload {
                key: GlobalAppState::SERVER.into(),
                value: Some(
                    Value::Server(crate::store::app_state::ValueServer {
                        server,
                    })
                ),
            })
            .unwrap();
        });
    }

    pub fn subscribe_state_events(&mut self, app_handle: AppHandle) {
        let app_handle_copy = app_handle.app_handle();
        let _id = app_handle.listen_global(STATE_CHANGE_EVENT, move |event| {
            if let Some(payload) = event.payload() {
                match serde_json::from_str(payload) {
                    Ok(data) => {
                        let app_handle = app_handle_copy.app_handle();
                        spawn(async move { Self::emit_state_async(data, app_handle).await });
                    }
                    Err(e) => {
                        println!("Failed to deserialize payload: {}", e);
                    }
                }
            }
        });
    }

    pub fn init(&mut self, app_handle: AppHandle) {
        self.subscribe_state_events(app_handle.app_handle());
    }
}
