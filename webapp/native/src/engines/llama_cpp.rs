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

use phf::phf_map;
use tokio::sync::Mutex;
use std::sync::Arc;
use crate::data::{Payload, ServerPayload};
use crate::store::server::{
    ServerParameterDefinition,
    ServerParameterType,
    ServerParameterValue,
};
use crate::ServerStatus;
use tauri::{ api::process::CommandChild, async_runtime::JoinHandle };
use tauri::{ api::process::{ Command, CommandEvent }, Runtime, Manager };

pub struct LLamaCppEngine {}

pub static LLAMACPP_PARAMETERS_DEFINITIONS: phf::Map<
    &str,
    ServerParameterDefinition
> = phf_map! {
    "model" =>
        ServerParameterDefinition {
            key: "model",
            optional: true,
            r#type: ServerParameterType::String,
            default_value: ServerParameterValue::None(()),
            option: "-m",
            long_option: "--model",
        },
    "host" =>
        ServerParameterDefinition {
            key: "host",
            optional: true,
            r#type: ServerParameterType::String,
            default_value: ServerParameterValue::String("127.0.0.1"),
            option: "",
            long_option: "--host",
        },
    "port" =>
        ServerParameterDefinition {
            key: "port",
            optional: true,
            r#type: ServerParameterType::Integer,
            default_value: ServerParameterValue::Integer(8080),
            option: "",
            long_option: "--port",
        },
    "context_size" =>
        ServerParameterDefinition {
            key: "context_size",
            optional: true,
            r#type: ServerParameterType::Integer,
            default_value: ServerParameterValue::Integer(512),
            option: "-c",
            long_option: "--ctx-size",
        },
    "threads" =>
        ServerParameterDefinition {
            key: "threads",
            optional: true,
            r#type: ServerParameterType::Integer,
            default_value: ServerParameterValue::Integer(6),
            option: "-t",
            long_option: "--threads",
        },
    "threads_batch" =>
        ServerParameterDefinition {
            key: "threads_batch",
            optional: true,
            r#type: ServerParameterType::Integer,
            default_value: ServerParameterValue::Integer(6),
            option: "-tb",
            long_option: "--threads-batch",
        },
    "n_gpu_layers" =>
        ServerParameterDefinition {
            key: "n_gpu_layers",
            optional: true,
            r#type: ServerParameterType::Integer,
            default_value: ServerParameterValue::Integer(0),
            option: "-ngl",
            long_option: "--n-gpu-layers",
        },
    "batch_size" =>
        ServerParameterDefinition {
            key: "batch_size",
            optional: true,
            r#type: ServerParameterType::Integer,
            default_value: ServerParameterValue::Integer(512),
            option: "-b",
            long_option: "--batch-size",
        },
    "timeout" =>
        ServerParameterDefinition {
            key: "timeout",
            optional: true,
            r#type: ServerParameterType::Integer,
            default_value: ServerParameterValue::Integer(600),
            option: "-to",
            long_option: "--timeout",
        },
    "verbose" =>
        ServerParameterDefinition {
            key: "verbose",
            optional: true,
            r#type: ServerParameterType::Boolean,
            default_value: ServerParameterValue::Boolean(false),
            option: "-v",
            long_option: "--verbose",
        },
    "path" => 
        ServerParameterDefinition {
            key: "path",
            optional: true,
            r#type: ServerParameterType::String,
            default_value: ServerParameterValue::String("examples/server/public"),
            option: "",
            long_option: "--path",
        },
    "rope_scaling" =>
        ServerParameterDefinition {
            key: "host",
            optional: true,
            r#type: ServerParameterType::String,
            default_value: ServerParameterValue::String("linear"),
            option: "",
            long_option: "--rope-scaling",
        },
    "rope_freq_base" => 
        ServerParameterDefinition {
            key: "rope_freq_base",
            optional: true,
            r#type: ServerParameterType::Number,
            default_value: ServerParameterValue::None(()),
            option: "",
            long_option: "--rope-freq-base",
        },
    "rope_freq_scale" => 
        ServerParameterDefinition {
            key: "rope_freq_scale",
            optional: true,
            r#type: ServerParameterType::Number,
            default_value: ServerParameterValue::None(()),
            option: "",
            long_option: "--rope-freq-scale",
        },
    "yarn_ext_factor" => 
        ServerParameterDefinition {
            key: "yarn_ext_factor",
            optional: true,
            r#type: ServerParameterType::Number,
            default_value: ServerParameterValue::Number(1.0),
            option: "",
            long_option: "--yarn-ext-factor",
        },
    "yarn_attn_factor" => 
        ServerParameterDefinition {
            key: "yarn_attn_factor",
            optional: true,
            r#type: ServerParameterType::Number,
            default_value: ServerParameterValue::Number(1.0),
            option: "",
            long_option: "--yarn-attn-factor",
        },
    "yarn_beta_slow" => 
        ServerParameterDefinition {
            key: "yarn_beta_slow",
            optional: true,
            r#type: ServerParameterType::Number,
            default_value: ServerParameterValue::Number(1.0),
            option: "",
            long_option: "--yarn-beta-slow",
        },
    "yarn_beta_fast" => 
        ServerParameterDefinition {
            key: "yarn_beta_fast",
            optional: true,
            r#type: ServerParameterType::Number,
            default_value: ServerParameterValue::Number(32.0),
            option: "",
            long_option: "--yarn-beta-fast",
        },
    "memory_f32" => 
        ServerParameterDefinition {
            key: "memory_f32",
            optional: true,
            r#type: ServerParameterType::Boolean,
            default_value: ServerParameterValue::Boolean(false),
            option: "",
            long_option: "--memory-f32",
        },
    "mlock" => 
        ServerParameterDefinition {
            key: "mlock",
            optional: true,
            r#type: ServerParameterType::Boolean,
            default_value: ServerParameterValue::Boolean(false),
            option: "",
            long_option: "--mlock",
        },
    "no_mmap" => 
        ServerParameterDefinition {
            key: "no_mmap",
            optional: true,
            r#type: ServerParameterType::Boolean,
            default_value: ServerParameterValue::Boolean(false),
            option: "",
            long_option: "--no-mmap",
        },
    "numa" => 
        ServerParameterDefinition {
            key: "numa",
            optional: true,
            r#type: ServerParameterType::Boolean,
            default_value: ServerParameterValue::Boolean(false),
            option: "",
            long_option: "--numa",
        },
    "tensor_split" => 
        ServerParameterDefinition {
            key: "tensor_split",
            optional: true,
            r#type: ServerParameterType::String,
            default_value: ServerParameterValue::None(()),
            option: "ts",
            long_option: "--tensor-split",
        },
    "main_gpu" => 
        ServerParameterDefinition {
            key: "main_gpu",
            optional: true,
            r#type: ServerParameterType::Integer,
            default_value: ServerParameterValue::None(()),
            option: "-mg",
            long_option: "--main-gpu",
        },
    "no_mul_mat_q" => 
        ServerParameterDefinition {
            key: "no_mul_mat_q",
            optional: true,
            r#type: ServerParameterType::Boolean,
            default_value: ServerParameterValue::Boolean(false),
            option: "",
            long_option: "--no-mul-mat-q",
        },
    "alias" => 
        ServerParameterDefinition {
            key: "alias",
            optional: true,
            r#type: ServerParameterType::String,
            default_value: ServerParameterValue::None(()),
            option: "-a",
            long_option: "--alias",
        },
    "lora" => 
        ServerParameterDefinition {
            key: "lora",
            optional: true,
            r#type: ServerParameterType::String,
            default_value: ServerParameterValue::None(()),
            option: "",
            long_option: "--lora",
        },
    "lora_base" => 
        ServerParameterDefinition {
            key: "lora_base",
            optional: true,
            r#type: ServerParameterType::String,
            default_value: ServerParameterValue::None(()),
            option: "",
            long_option: "--lora-base",
        },
    "embedding" => 
        ServerParameterDefinition {
            key: "embedding",
            optional: true,
            r#type: ServerParameterType::Boolean,
            default_value: ServerParameterValue::Boolean(false),
            option: "",
            long_option: "--embedding",
        },
    "parallel" => 
        ServerParameterDefinition {
            key: "parallel",
            optional: true,
            r#type: ServerParameterType::Integer,
            default_value: ServerParameterValue::Integer(1),
            option: "-np",
            long_option: "--parallel",
        },
    "cont_batching" => 
        ServerParameterDefinition {
            key: "cont_batching",
            optional: true,
            r#type: ServerParameterType::Boolean,
            default_value: ServerParameterValue::Boolean(false),
            option: "-cb",
            long_option: "--cont-batching",
        },
    "system_prompt_file" => 
        ServerParameterDefinition {
            key: "system_prompt_file",
            optional: true,
            r#type: ServerParameterType::String,
            default_value: ServerParameterValue::None(()),
            option: "-spf",
            long_option: "--system-prompt-file",
        },
    "mmproj" => 
        ServerParameterDefinition {
            key: "mmproj",
            optional: true,
            r#type: ServerParameterType::String,
            default_value: ServerParameterValue::None(()),
            option: "",
            long_option: "--mmproj",
        },
    };

impl LLamaCppEngine {
    pub async fn start_llama_cpp_server<EventLoopMessage: Runtime + 'static>(
        // self: &mut Self,
        app: tauri::AppHandle<EventLoopMessage>,
        model: &str,
        arguments: Vec<String>,
        wpid: Arc<Mutex<usize>>,
        wstatus: Arc<Mutex<ServerStatus>>,
        command_child: Arc<Mutex<Option<CommandChild>>>
    ) -> Result<JoinHandle<()>, String> {
        let command = Command::new_sidecar("llama.cpp.server").map_err(
            |_| "failed to init llama.cpp.server"
        )?;
        let model = model.to_string();
        let handle = tauri::async_runtime::spawn(async move {
            let (mut rx, child) = match command.args(arguments).spawn() {
                Ok((rx, child)) => (rx, child),
                Err(err) => {
                    println!("Opla server error: {}", err);
                    if
                        app
                            .emit_all("opla-server", Payload::Server(ServerPayload {
                                message: format!("Opla server error: {}", err),
                                status: ServerStatus::Error.as_str().to_string(),
                            }))
                            .is_err()
                    {
                        println!("Opla server error: {}", "failed to emit error");
                    }
                    let mut st = wstatus.lock().await;
                    *st = ServerStatus::Error;
                    return;
                }
            };
            println!("Opla server started:{}", model);
            if
                app
                    .emit_all("opla-server", Payload::Server(ServerPayload {
                        message: format!("{}", model),
                        status: ServerStatus::Starting.as_str().to_string(),
                    }))
                    .is_err()
            {
                println!("Opla server error: {}", "failed to emit started");
            }
            let p: usize = match child.pid().try_into() {
                Ok(pid) => pid,
                Err(_) => {
                    println!("Opla server error: {}", "failed to get pid");
                    if
                        app
                            .emit_all("opla-server", Payload::Server(ServerPayload {
                                message: format!("Opla server error: {}", "failed to get pid"),
                                status: ServerStatus::Error.as_str().to_string(),
                            }))
                            .is_err()
                    {
                        println!("Opla server error: {}", "failed to emit error");
                    }
                    let mut st = wstatus.lock().await;
                    *st = ServerStatus::Error;
                    return;
                }
            };
            let mut wp = wpid.lock().await;
            *wp = p;
            drop(wp);
            let mut cchild = command_child.lock().await;
            *cchild = Some(child);
            drop(cchild);

            while let Some(event) = rx.recv().await {
                if let CommandEvent::Stdout(line) = event {
                    println!("json={}", line);
                    if line.contains("model loaded") { // line.contains("HTTP server is listening") {
                        println!("{}", model);
                        if
                            app
                                .emit_all("opla-server", Payload::Server(ServerPayload {
                                    message: format!("{}", model),
                                    status: ServerStatus::Started.as_str().to_string(),
                                }))
                                .is_err()
                        {
                            println!("Opla server error: {}", "failed to emit started");
                        }

                        let mut st = wstatus.lock().await;
                        *st = ServerStatus::Started;
                    } else if
                        app
                            .emit_all("opla-server", Payload::Server(ServerPayload {
                                message: line.clone(),
                                status: ServerStatus::Stdout.as_str().to_string(),
                            }))
                            .is_err()
                    {
                        println!("Opla server error: {}", "failed to emit stdout");
                    }
                } else if let CommandEvent::Stderr(line) = event {
                    println!("\x1b[93m{}\x1b[0m", line);

                    if line.starts_with("llama server listening") {
                        println!("{}", model);
                        if
                            app
                                .emit_all("opla-server", Payload::Server(ServerPayload {
                                    message: format!("{}", model),
                                    status: ServerStatus::Started.as_str().to_string(),
                                }))
                                .is_err()
                        {
                            println!("Opla server error: {}", "failed to emit started");
                        }

                        let mut st = wstatus.lock().await;
                        *st = ServerStatus::Started;
                    }

                    if line.starts_with("error") {
                        println!("Opla server error: {}", line);
                        if
                            app
                                .emit_all("opla-server", Payload::Server(ServerPayload {
                                    message: format!("Opla server error: {}", line),
                                    status: ServerStatus::Error.as_str().to_string(),
                                }))
                                .is_err()
                        {
                            println!("Opla server error: {}", "failed to emit error");
                        }

                        let mut st = wstatus.lock().await;
                        *st = ServerStatus::Error;
                    }

                    if
                        app
                            .emit_all("opla-server-stderr", Payload::Server(ServerPayload {
                                message: line.clone(),
                                status: ServerStatus::Stderr.as_str().to_string(),
                            }))
                            .is_err()
                    {
                        println!("Opla server error: {}", "failed to emit stderr");
                    }
                }
            }
        });
        // self.handle = Some(handle);
        Ok(handle)
    }
}
