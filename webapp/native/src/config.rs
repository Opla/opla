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

use std::fs;
use serde::{ Deserialize, Serialize };

use crate::utils::Utils;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LLModel {
    pub name: String,
    pub path: String,
    pub file_name: String,
    pub description: String,
    pub version: String,
    pub license: String,
    pub author: String,
    pub url: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelsConfig {
    pub path: String,
    pub default_model: String,
    pub items: Vec<LLModel>,
}

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
pub struct Config {
    pub start_app: bool,
    pub welcome_splash: bool,
    pub server: ServerConfiguration,
    pub models: ModelsConfig,
}

impl Config {
    pub fn load_config() -> Result<Self, Box<dyn std::error::Error>> {
        let home_dir = Utils::get_config_directory().expect("Failed to get config directory");
        let config_path = home_dir.join("config.json");

        if config_path.exists() {
            let config_data = fs::read_to_string(config_path)?;
            let config: Config = serde_json::from_str(&config_data)?;
            Ok(config)
        } else {
            // load default config from app path
            let app_path = std::env::current_exe()?;
            println!("app_path: {}", app_path.to_str().unwrap());
            let default_config_path = app_path.with_file_name("opla_default_config.json");

            if default_config_path.exists() {
                let default_config_data = fs::read_to_string(default_config_path)?;
                let default_config: Config = serde_json::from_str(&default_config_data)?;
                Ok(default_config)
            } else {
                // Return a default config if neither file exists
                Ok(Config {
                    start_app: true,
                    welcome_splash: true,
                    server: ServerConfiguration {
                        name: String::from("llama.cpp"),
                        launch_at_startup: true,
                        binary: String::from("binaries/llama.cpp/llama.cpp.server"),
                        parameters: ServerParameters {
                            port: 8082,
                            host: String::from("127.0.0.1"),
                            context_size: 512,
                            threads: 6,
                            n_gpu_layers: 0,
                        },
                    },
                    models: ModelsConfig {
                        path: String::from("dev/ai/models"),
                        default_model: String::from("OpenHermes 2.5 - Mistral 7B"),
                        items: vec![LLModel {
                            name: String::from("OpenHermes 2.5 - Mistral 7B"),
                            path: String::from("openhermes-7b-v2.5"),
                            file_name: String::from("ggml-model-q4_k.gguf"),
                            description: String::from(
                                "OpenHermes 2.5 Mistral 7B is a state of the art Mistral Fine-tune, a continuation of OpenHermes 2 model, which trained on additional code datasets."
                            ),
                            version: String::from("2.5.0"),
                            license: String::from("Apache-2.0"),
                            author: String::from("Teknium"),
                            url: String::from(
                                "https://huggingface.co/teknium/OpenHermes-2.5-Mistral-7B"
                            ),
                        }],
                    },
                })
            }
        }
    }

    pub fn save_config(&self) -> Result<(), Box<dyn std::error::Error>> {
        let home_dir = Utils::get_config_directory().expect("Failed to get config directory");
        let config_path = home_dir.join("config.json");

        let config_data = serde_json::to_string_pretty(self)?;
        fs::write(config_path, config_data)?;

        Ok(())
    }
}
