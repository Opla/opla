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

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(untagged)]
pub enum ServerParameter {
    String(String),
    Number(f32),
    Integer(i32),
    Boolean(bool),
    Option(Option<String>),
}

impl ServerParameter {
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
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerConfiguration {
    pub name: String,
    pub parameters: HashMap<String, ServerParameter>,
}

impl ServerConfiguration {
    pub fn remove_parameter(&mut self, key: &str) {
        self.parameters.remove(key);
    }

    pub fn set_parameter_string(&mut self, key: &str, value: String) {
        self.parameters.insert(key.to_string(), ServerParameter::String(value));
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
        self.parameters.insert(key.to_string(), ServerParameter::Integer(value));
    }

    pub fn get_parameter_int(&self, key: &str, default_value: i32) -> i32 {
        self.parameters
            .get(key)
            .map(|s| s.to_int(default_value))
            .unwrap_or(default_value)
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

    pub fn to_args(&self, model_path: &str) -> Vec<String> {
        let mut parameters: Vec<String> = Vec::with_capacity(12);
        parameters.push(format!("-m"));
        parameters.push(format!("{}", model_path.to_string()));
        parameters.push(format!("--port"));
        parameters.push(format!("{}", self.get_parameter_int("port", 8081)));
        parameters.push(format!("--host"));
        parameters.push(format!("{}", self.get_parameter_string("host", "127.0.0.1".to_string())));
        parameters.push(format!("-c"));
        parameters.push(format!("{}", self.get_parameter_int("context_size", 512)));
        parameters.push(format!("-t"));
        parameters.push(format!("{}", self.get_parameter_int("threads", 6)));
        parameters.push(format!("-ngl"));
        parameters.push(format!("{}", self.get_parameter_int("n_gpu_layers", 0)));
        parameters
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerStorage {
    pub launch_at_startup: bool,
    pub binary: String,
    #[serde(flatten)]
    pub configuration: ServerConfiguration,
}

impl ServerStorage {
    pub fn default() -> Self {
        let mut server_parameters: HashMap<String, ServerParameter> = HashMap::new();
        server_parameters.insert("port".to_string(), ServerParameter::Integer(8081));
        server_parameters.insert(
            "host".to_string(),
            ServerParameter::String("127.0.0.1".to_string())
        );
        server_parameters.insert("model_id".to_string(), ServerParameter::Option(None));
        server_parameters.insert("model_path".to_string(), ServerParameter::Option(None));
        server_parameters.insert("context_size".to_string(), ServerParameter::Integer(512));
        server_parameters.insert("threads".to_string(), ServerParameter::Integer(6));
        server_parameters.insert("n_gpu_layers".to_string(), ServerParameter::Integer(0));
        ServerStorage {
            launch_at_startup: true,
            binary: String::from("binaries/llama.cpp/llama.cpp.server"),
            configuration: ServerConfiguration {
                name: String::from("llama.cpp"),
                parameters: server_parameters,
            },
        }
    }
}
