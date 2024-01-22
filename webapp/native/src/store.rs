// Copyright 2023 mik
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

use std::{ fs, path::PathBuf, fmt, collections::HashMap };
use serde::{ Deserialize, Serialize };
use crate::{ utils::get_config_directory, downloader::Download, data::model::ModelStorage };

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerParameters {
    pub port: i32,
    pub host: String,
    pub context_size: i32,
    pub threads: i32,
    pub n_gpu_layers: i32,
}

impl ServerParameters {
    pub fn to_args(&self, model_path: &str) -> Vec<String> {
        let mut parameters: Vec<String> = Vec::with_capacity(12);
        parameters.push(format!("-m"));
        parameters.push(format!("{}", model_path.to_string()));
        parameters.push(format!("--port"));
        parameters.push(format!("{}", self.port));
        parameters.push(format!("--host"));
        parameters.push(format!("{}", self.host));
        parameters.push(format!("-c"));
        parameters.push(format!("{}", self.context_size));
        parameters.push(format!("-t"));
        parameters.push(format!("{}", self.threads));
        parameters.push(format!("-ngl"));
        parameters.push(format!("{}", self.n_gpu_layers));
        parameters
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerConfiguration {
    pub name: String,
    pub launch_at_startup: bool,
    pub binary: String,
    pub parameters: ServerParameters,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ProviderType {
    #[serde(rename = "opla")]
    Opla,
    #[serde(rename = "server")]
    Server,
    #[serde(rename = "api")]
    Api,
    #[serde(rename = "proxy")]
    Proxy,
}
/* impl ProviderType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ProviderType::Opla => "opla",
            ProviderType::Server => "server",
            ProviderType::Api => "api",
            ProviderType::Proxy => "proxy",
        }
    }
} */

impl fmt::Display for ProviderType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ProviderType::Opla => write!(f, "opla"),
            ProviderType::Server => write!(f, "server"),
            ProviderType::Api => write!(f, "api"),
            ProviderType::Proxy => write!(f, "proxy"),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProviderMetadata {
    pub server: ServerConfiguration,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Provider {
    pub name: String,
    pub r#type: String,
    pub url: String,
    pub description: String,
    pub doc_url: Option<String>,
    pub key: Option<String>,
    pub disabled: bool,
    pub metadata: Option<ProviderMetadata>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WindowSettings {
    pub width: u32,
    pub height: u32,
    pub fullscreen: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PageSettings {
    pub explorer_hidden: bool,
    pub settings_hidden: bool,
    pub explorer_width: f32,
    pub settings_width: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Settings {
    pub start_app: bool,
    pub welcome_splash: bool,
    pub window: Option<WindowSettings>,
    pub selected_page: Option<String>,
    pub pages: Option<HashMap<String, PageSettings>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Store {
    pub settings: Settings,
    pub server: ServerConfiguration,
    pub models: ModelStorage,
    pub downloads: Vec<Download>,
}

impl Store {
    pub fn new() -> Self {
        Store {
            settings: Settings {
                start_app: true,
                welcome_splash: true,
                window: None,
                selected_page: None,
                pages: None,
            },
            server: ServerConfiguration {
                name: String::from("llama.cpp"),
                launch_at_startup: true,
                binary: String::from("binaries/llama.cpp/llama.cpp.server"),
                parameters: ServerParameters {
                    port: 8081,
                    host: String::from("127.0.0.1"),
                    context_size: 512,
                    threads: 6,
                    n_gpu_layers: 0,
                },
            },
            models: ModelStorage {
                path: None,
                default_model: None,
                items: vec![],
            },
            downloads: vec![],
        }
    }

    pub fn set(&mut self, new_config: Store) {
        self.settings = new_config.settings.clone();
        self.server = new_config.server.clone();
        self.models = new_config.models.clone();
    }

    pub fn load(&mut self, asset_dir: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
        let home_dir = get_config_directory()?;
        let config_path = home_dir.join("config.json");

        if config_path.exists() {
            let config_data = fs::read_to_string(config_path)?;
            let config: Store = serde_json::from_str(&config_data)?;
            self.set(config);
        } else {
            let default_config_path = asset_dir.join("opla_default_config.json");
            if default_config_path.exists() {
                let default_config_data = fs::read_to_string(default_config_path)?;
                let default_config: Store = serde_json::from_str(&default_config_data)?;
                println!("default_config: {:?}", default_config);
                self.set(default_config);
            }
        }
        Ok(())
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let home_dir = get_config_directory()?;
        let config_path = home_dir.join("config.json");

        let config_data = serde_json::to_string_pretty(self)?;
        fs::write(config_path, config_data)?;

        Ok(())
    }
}
