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

use tokio::sync::Mutex;
use std::collections::HashMap;
use std::sync::Arc;
use crate::data::{Payload, ServerPayload};
use crate::engines::llama_cpp::{ LLamaCppEngine, LLAMACPP_PARAMETERS_DEFINITIONS };
use crate::store::server::{ ServerConfiguration, ServerStorage };
use crate::error::Error;
use sysinfo::System;
use tauri::{ api::process::CommandChild, async_runtime::JoinHandle };
use tauri::{ Runtime, Manager };
use std::time::Duration;
use std::thread;

pub struct LocalServer {
    pub pid: Arc<Mutex<usize>>,
    pub status: Arc<Mutex<ServerStatus>>,
    handle: Option<JoinHandle<()>>,
    command_child: Arc<Mutex<Option<CommandChild>>>,
    pub configuration: ServerConfiguration,
}

#[derive(Clone, serde::Serialize, Copy, PartialEq, Debug)]
pub enum ServerStatus {
    Init,
    Wait,
    Starting,
    Started,
    Stopping,
    Stopped,
    Error,
    Stdout,
    Stderr,
}

impl ServerStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ServerStatus::Init => "init",
            ServerStatus::Wait => "wait",
            ServerStatus::Starting => "starting",
            ServerStatus::Started => "started",
            ServerStatus::Stopping => "stopping",
            ServerStatus::Stopped => "stopped",
            ServerStatus::Error => "error",
            ServerStatus::Stdout => "stdout",
            ServerStatus::Stderr => "stderr",
        }
    }
}

impl LocalServer {
    pub fn new() -> Self {
        LocalServer {
            pid: Arc::new(Mutex::new(0)),
            status: Arc::new(Mutex::new(ServerStatus::Init)),
            handle: None,
            command_child: Arc::new(Mutex::new(None)),
            configuration: ServerConfiguration {
                name: "".to_string(),
                parameters: HashMap::new(),
            },
        }
    }

    fn sysinfo_test() {
        let sys = System::new_all();
        println!("=> system:");
        // RAM and swap information:
        println!("total memory: {} bytes", sys.total_memory());
        println!("used memory : {} bytes", sys.used_memory());
        println!("total swap  : {} bytes", sys.total_swap());
        println!("used swap   : {} bytes", sys.used_swap());

        // Display system information:
        println!("System name:             {:?}", System::name());
        println!("System kernel version:   {:?}", System::kernel_version());
        println!("System OS version:       {:?}", System::os_version());
        println!("System host name:        {:?}", System::host_name());
        // Number of CPUs:
        println!("NB CPUs: {}", sys.cpus().len());
    }

    pub fn get_status(&self) -> Result<Payload, String> {
        let status = match self.status.try_lock() {
            Ok(status) => status.as_str(),
            Err(_) => {
                println!("Opla server error try to read status");
                return Err("Opla server can't read status".to_string());
            }
        };
        let mut message = "None".to_string();
        match self.configuration.get_optional_parameter_string("model_id") {
            Some(model) => {
                message = model;
            }
            None => (),
        }

        Ok(Payload::Server(ServerPayload {
            status: status.to_string(),
            message,
        }))
    }

    pub fn set_status(&mut self, status: ServerStatus) -> Result<Payload, String> {
        let mut wstatus = match self.status.try_lock() {
            Ok(status) => status,
            Err(_) => {
                println!("Opla server error try to write status");
                return Err("Opla server can't write status".to_string());
            }
        };
        *wstatus = status;
        let message = self.configuration.name.clone();
        Ok(Payload::Server(ServerPayload  {
            status: wstatus.as_str().to_string(),
            message,
        }))
    }

    pub async fn start<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        configuration: &ServerConfiguration
    ) -> Result<Payload, String> {
        let status = match self.status.try_lock() {
            Ok(status) => status.as_str(),
            Err(_) => {
                println!("Opla server error try to read status");
                return Err("Opla server can't read status".to_string());
            }
        };
        let name = configuration.name.to_string();
        self.configuration = configuration.clone();
        let configuration = configuration.clone();
        let model_path = match configuration.get_optional_parameter_string("model_path") {
            Some(s) => s,
            None => {
                println!("Opla server error try to read parameters: model_path");
                return Err("Opla server can't read parameters: model_path".to_string());
            }
        };
        let model_id = match configuration.get_optional_parameter_string("model_id") {
            Some(s) => s,
            None => {
                println!("Opla server error try to read parameters: model_id");
                return Err("Opla server can't read parameters: model_id".to_string());
            }
        };
        let arguments = configuration.to_args(&model_path, &LLAMACPP_PARAMETERS_DEFINITIONS);
        println!("Opla server arguments: {}", arguments.join(" "));
        if status == ServerStatus::Starting.as_str().to_string() {
            println!("Opla server is starting: stop it");
            match self.stop(&app).await {
                Ok(_) => {}
                Err(e) => {
                    return Err(e);
                }
            }
        } else if status == ServerStatus::Started.as_str().to_string() {
            println!("Opla server already started ");
            return Ok(Payload::Server(ServerPayload  {
                status: status.to_string(),
                message: "llama.cpp.server".to_string(),
            }));
        }
        println!("Opla try to start {:?}", configuration.get_optional_parameter_string("model_id"));
        let mut wstatus = match self.status.try_lock() {
            Ok(status) => status,
            Err(_) => {
                println!("Opla server error try to write status");
                return Err("Opla server can't write status".to_string());
            }
        };
        *wstatus = ServerStatus::Starting;
        let status_response = wstatus.as_str().to_string();
        app
            .emit_all("opla-server", Payload::Server(ServerPayload  {
                message: format!("{:?}", configuration.get_optional_parameter_string("model_id")),
                status: "waiting".to_string(),
            }))
            .map_err(|err| err.to_string())?;
        drop(wstatus);

        let wpid = Arc::clone(&self.pid);
        let wstatus = Arc::clone(&self.status);
        let command_child = Arc::clone(&self.command_child);
        let handle = LLamaCppEngine::start_llama_cpp_server(
            app,
            &model_id,
            arguments,
            wpid,
            wstatus,
            command_child
        ).await?;
        self.handle = Some(handle);
        Ok(Payload::Server(ServerPayload  { status: status_response, message: name }))
    }

    pub async fn stop<R: Runtime>(&mut self, app: &tauri::AppHandle<R>) -> Result<Payload, String> {
        let pid = self.pid.lock().await.to_owned();
        println!("Opla try to stop {}", pid);
        let status = match self.status.try_lock() {
            Ok(status) => status.as_str(),
            Err(_) => {
                println!("Opla server error try to read status");
                return Err("Opla server can't read status".to_string());
            }
        };
        let message = self.configuration.name.clone();
        if (status == "started" || status == "starting") && pid.to_owned() != 0 {
            let mut wstatus = match self.status.try_lock() {
                Ok(status) => status,
                Err(_) => {
                    println!("Opla server error try to write status");
                    return Err("Opla server can't write status".to_string());
                }
            };
            *wstatus = ServerStatus::Stopping;
            drop(wstatus);
            app
                .emit_all("opla-server", Payload::Server(ServerPayload {
                    message: format!("Opla server to stop: {} ", "llama.cpp.server"),
                    status: ServerStatus::Stopping.as_str().to_string(),
                }))
                .map_err(|err| err.to_string())?;

            /* let sys = System::new_all();
            let pid = self.pid.lock().await.to_owned();
            let process = match sys.process(Pid::from(pid)) {
                Some(process) => process,
                None => {
                    println!("Opla server error trying to get process {}", pid);
                    return Err("Opla server can't get process".to_string());
                }
            };
            process.kill();
            println!("Kill Opla server {}", pid); */
            /* match self.handle.take() {
                Some(handle) => {
                    println!("Opla try to cancel task {:?}", handle);
                    handle.abort();
                }
                None => {
                    println!("Opla server error trying to get handler");
                    return Err("Opla server can't get handler".to_string());
                }
            } */
            match self.command_child.lock().await.take() {
                Some(child) => {
                    // println!("Opla try to kill child {:?}", child);
                    let result = child.kill();
                    match result {
                        Ok(_) => {
                            println!("Opla server killed: {} ", "llama.cpp.server");
                        }
                        Err(e) => {
                            println!("Opla server error trying to kill child {:?}", e);
                            return Err("Opla server can't kill child".to_string());
                        }
                    }
                }
                None => {
                    println!("Opla server error trying to get child");
                    return Err("Opla server can't get child".to_string());
                }
            }
            app
                .emit_all("opla-server", Payload::Server(ServerPayload {
                    message: format!("Opla server killed: {} ", "llama.cpp.server"),
                    status: ServerStatus::Stopped.as_str().to_string(),
                }))
                .map_err(|err| err.to_string())?;
            let mut wstatus = match self.status.try_lock() {
                Ok(status) => status,
                Err(_) => {
                    println!("Opla server error try to write status");
                    return Err("Opla server can't write status".to_string());
                }
            };
            *wstatus = ServerStatus::Stopped;

            return Ok(Payload::Server(ServerPayload {
                status: wstatus.as_str().to_string(),
                message,
            }));
        }
        Ok(Payload::Server(ServerPayload { status: status.to_string(), message }))
    }

    fn kill_previous_processes(&mut self) {
        let sys = System::new_all();
        let mut pid: u32 = 0;
        let mut started = false;

        // This will not work in Apple Macos sandbox
        for process in sys.processes_by_name("llama.cpp.server".as_ref()) {
            let name = process.name();
            if pid == 0 && !started {
                pid = process.pid().as_u32();
                started = true;
                println!("Opla server previously started {:?}", name);
            }
            println!("Opla server kill zombie {} / {:?}", process.pid(), name);
            process.kill();
        }
    }

    pub fn init(&mut self, store_server: ServerStorage) {
        Self::sysinfo_test();
        self.kill_previous_processes();
        self.configuration = store_server.configuration.clone();
    }

    pub async fn bind<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        configuration: &ServerConfiguration
    ) -> Result<(), Box<dyn std::error::Error>> {
        if !configuration.has_same_model(&self.configuration) {
            self.stop(&app).await?;
            let self_status = Arc::clone(&self.status);
            let mut wouldblock = true;
            let _ = self.start(app, configuration).await?;

            // Wait for server to start
            let result = tauri::async_runtime::spawn(async move {
                let mut retries = 0;
                while retries < 20 {
                    let status = match self_status.try_lock() {
                        Ok(status) => status,
                        Err(e) => {
                            println!("Opla server error try to read status {:?}", e);
                            if wouldblock {
                                // Retry after a short delay
                                thread::sleep(Duration::from_millis(100));
                                wouldblock = false;
                                continue;
                            }
                            println!("Opla server error try to read status {:?}", e);
                            return Err(Box::new(Error::ModelNotLoaded));
                        }
                    };
                    if *status == ServerStatus::Started {
                        drop(status);
                        break;
                    }
                    drop(status);
                    thread::sleep(Duration::from_secs(2));
                    retries += 1;
                }
                Ok(())
            }).await;
            match result {
                Ok(_) => {
                    println!("Opla server started: available for completion");
                }
                Err(e) => {
                    println!("Opla server error: {:?}", e);
                    return Err(Box::new(e));
                }
            }
        }
        Ok(())
    }

    pub fn remove_model(&mut self) {
        self.configuration.remove_model();
    }
}
