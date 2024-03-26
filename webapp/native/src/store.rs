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

use std::{ fs, path::PathBuf, fmt, collections::HashMap };
use serde::{ Deserialize, Serialize };
use crate::{
    data::{ model::{ self, ModelStorage }, service::{ Service, ServiceStorage, ServiceType } },
    downloader::Download,
    utils::get_config_directory,
};

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
    pub server: Option<ServerConfiguration>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Provider {
    pub name: String,
    pub r#type: String,
    pub url: String,
    pub description: Option<String>,
    pub doc_url: Option<String>,
    pub key: Option<String>,
    pub disabled: Option<bool>,
    pub metadata: Option<ProviderMetadata>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WindowSettings {
    pub width: u32,
    pub height: u32,
    pub fullscreen: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExplorerGroup {
    pub title: String,
    pub hidden: bool,
    pub height: f32,
    pub closed: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PageSettings {
    pub selected_id: Option<String>,
    pub explorer_hidden: bool,
    pub settings_hidden: bool,
    pub explorer_width: f32,
    pub settings_width: f32,
    pub explorer_groups: Option<Vec<ExplorerGroup>>,
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
    pub services: ServiceStorage,
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
                // active_model: None,
                items: vec![],
            },
            downloads: vec![],
            services: ServiceStorage {
                active_service: None,
            },
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

    pub fn has_model(&self, model_id_or_name: &str) -> bool {
        self.models.items.iter().any(
            |m|
                m.reference.name == model_id_or_name ||
                (match &m.reference.id {
                    Some(id) => id == model_id_or_name,
                    None => false,
                })
        )
    }

    pub fn set_local_active_model_id(&mut self, model_id: &str) {
        if self.has_model(model_id) {
            let mut service = Service::new(ServiceType::Model);
            service.model_id = Some(model_id.to_owned());
            service.provider_id_or_name = Some("Opla".to_owned());
            self.services.active_service = Some(service);
        }
    }

    pub fn get_local_active_model_id(&self) -> Option<String> {
        let model_id = self.services.get_active_model_id();
        let provider = self.services.get_active_provider_id();
        if provider == Some("Opla".to_owned()) && model_id.is_some() && self.has_model(model_id.as_ref().unwrap()) {
            return model_id;
        }
        return None;
    }

    pub fn clear_active_service_if_model_equal(&mut self, model_id: &str) {
        if let Some(model_id) = self.get_local_active_model_id() {
            self.services.active_service = None;
        }
    }
}
