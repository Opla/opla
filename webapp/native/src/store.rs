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

use std::{ fs, path::PathBuf };
use serde::{ Deserialize, Serialize };
use crate::{ utils::Utils, downloader::Download, data::model::ModelStorage };

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerParameters {
    pub port: i32,
    pub host: String,
    pub context_size: i32,
    pub threads: i32,
    pub n_gpu_layers: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerConfiguration {
    pub name: String,
    pub launch_at_startup: bool,
    pub binary: String,
    pub parameters: ServerParameters,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Settings {
    pub start_app: bool,
    pub welcome_splash: bool,
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
                path: String::from("models"),
                default_model: String::from("None"),
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
        let home_dir = Utils::get_config_directory().expect("Failed to get config directory");
        let config_path = home_dir.join("config.json");

        if config_path.exists() {
            let config_data = fs::read_to_string(config_path)?;
            let config: Store = serde_json::from_str(&config_data)?;
            self.set(config);
        } else {
            let default_config_path = asset_dir.join("opla_default_config.json");
            println!(
                "asset_dir: {} / {} / {}",
                asset_dir.to_str().unwrap(),
                default_config_path.to_str().unwrap(),
                default_config_path.exists()
            );
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
        let home_dir = Utils::get_config_directory().expect("Failed to get config directory");
        let config_path = home_dir.join("config.json");

        let config_data = serde_json::to_string_pretty(self)?;
        fs::write(config_path, config_data)?;

        Ok(())
    }
}
