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

use tokio::{ spawn, sync::{ mpsc::channel, Mutex } };
use std::{ collections::HashMap, sync::Arc };
use crate::{
    error::Error,
    providers::{
        llama_cpp::LLamaCppInferenceClient,
        llm::{
            LlmCompletionOptions,
            LlmCompletionResponse,
            LlmError,
            LlmQuery,
            LlmQueryCompletion,
            LlmTokenizeResponse,
        },
        ProvidersManager,
    },
    store::{ ServerConfiguration, ServerParameters },
};
use sysinfo::System;
use tauri::{ api::process::CommandChild, async_runtime::JoinHandle };
use tauri::{ api::process::{ Command, CommandEvent }, Runtime, Manager };
use std::time::Duration;
use std::thread;

pub struct LocalServer {
    pub pid: Arc<Mutex<usize>>,
    pub name: String,
    pub status: Arc<Mutex<ServerStatus>>,
    pub parameters: Option<ServerParameters>,
    inference_client: LLamaCppInferenceClient,
    handle: Option<JoinHandle<()>>,
    command_child: Arc<Mutex<Option<CommandChild>>>,
    completion_handles: Arc<Mutex<HashMap<String, Arc<tokio::task::JoinHandle<()>>>>>,
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

#[derive(Clone, Debug, serde::Serialize)]
pub struct Payload {
    pub message: String,
    pub status: String,
}

impl LocalServer {
    pub fn new() -> Self {
        LocalServer {
            pid: Arc::new(Mutex::new(0)),
            name: "llama.cpp.server".to_string(),
            status: Arc::new(Mutex::new(ServerStatus::Init)),
            parameters: None,
            inference_client: LLamaCppInferenceClient::new(None),
            handle: None,
            command_child: Arc::new(Mutex::new(None)),
            completion_handles: Arc::new(Mutex::new(HashMap::new())),
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

    pub async fn start_llama_cpp_server<EventLoopMessage: Runtime + 'static>(
        self: &mut Self,
        app: tauri::AppHandle<EventLoopMessage>,
        model: &str,
        arguments: Vec<String>,
        wpid: Arc<Mutex<usize>>,
        wstatus: Arc<Mutex<ServerStatus>>,
        command_child: Arc<Mutex<Option<CommandChild>>>
    ) -> Result<(), String> {
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
                            .emit_all("opla-server", Payload {
                                message: format!("Opla server error: {}", err),
                                status: ServerStatus::Error.as_str().to_string(),
                            })
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
                    .emit_all("opla-server", Payload {
                        message: format!("{}", model),
                        status: ServerStatus::Starting.as_str().to_string(),
                    })
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
                            .emit_all("opla-server", Payload {
                                message: format!("Opla server error: {}", "failed to get pid"),
                                status: ServerStatus::Error.as_str().to_string(),
                            })
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
                    if line.contains("HTTP server listening") {
                        println!("{}", model);
                        if
                            app
                                .emit_all("opla-server", Payload {
                                    message: format!("{}", model),
                                    status: ServerStatus::Started.as_str().to_string(),
                                })
                                .is_err()
                        {
                            println!("Opla server error: {}", "failed to emit started");
                        }

                        let mut st = wstatus.lock().await;
                        *st = ServerStatus::Started;
                    } else if
                        app
                            .emit_all("opla-server", Payload {
                                message: line.clone(),
                                status: ServerStatus::Stdout.as_str().to_string(),
                            })
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
                                .emit_all("opla-server", Payload {
                                    message: format!("{}", model),
                                    status: ServerStatus::Started.as_str().to_string(),
                                })
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
                                .emit_all("opla-server", Payload {
                                    message: format!("Opla server error: {}", line),
                                    status: ServerStatus::Error.as_str().to_string(),
                                })
                                .is_err()
                        {
                            println!("Opla server error: {}", "failed to emit error");
                        }

                        let mut st = wstatus.lock().await;
                        *st = ServerStatus::Error;
                    }

                    if
                        app
                            .emit_all("opla-server-stderr", Payload {
                                message: line.clone(),
                                status: ServerStatus::Stderr.as_str().to_string(),
                            })
                            .is_err()
                    {
                        println!("Opla server error: {}", "failed to emit stderr");
                    }
                }
            }
        });
        self.handle = Some(handle);
        Ok(())
    }

    pub fn remove_model(&mut self) {
        let parameters = match &self.parameters {
            Some(p) => p,
            None => {
                return;
            }
        };
        if parameters.model_id.is_some() {
            let mut parameters = parameters.clone();
            parameters.model_id = None;
            parameters.model_path = None;
            self.parameters = Some(parameters);
        }
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
        match &self.parameters {
            Some(parameters) =>
                match &parameters.model_id {
                    Some(model) => {
                        message = model.to_string();
                    }
                    None => (),
                }
            None => (),
        }
        Ok(Payload {
            status: status.to_string(),
            message,
        })
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
        Ok(Payload {
            status: wstatus.as_str().to_string(),
            message: self.name.to_string(),
        })
    }

    pub fn set_parameters(&mut self, parameters: Option<ServerParameters>) {
        self.parameters = parameters;
    }

    pub async fn start<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        parameters: &ServerParameters
    ) -> Result<Payload, String> {
        let status = match self.status.try_lock() {
            Ok(status) => status.as_str(),
            Err(_) => {
                println!("Opla server error try to read status");
                return Err("Opla server can't read status".to_string());
            }
        };
        self.parameters = Some(parameters.clone());
        let model_path = match &parameters.model_path {
            Some(s) => s,
            None => {
                println!("Opla server error try to read parameters: model_path");
                return Err("Opla server can't read parameters: model_path".to_string());
            }
        };
        let model_id = match &parameters.model_id {
            Some(s) => s,
            None => {
                println!("Opla server error try to read parameters: model_id");
                return Err("Opla server can't read parameters: model_id".to_string());
            }
        };
        let arguments = parameters.to_args(&model_path);
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
            return Ok(Payload {
                status: status.to_string(),
                message: "llama.cpp.server".to_string(),
            });
        }
        println!("Opla try to start {:?}", parameters.model_id);
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
            .emit_all("opla-server", Payload {
                message: format!("{:?}", parameters.model_id),
                status: "waiting".to_string(),
            })
            .map_err(|err| err.to_string())?;
        drop(wstatus);

        let wpid = Arc::clone(&self.pid);
        let wstatus = Arc::clone(&self.status);
        let command_child = Arc::clone(&self.command_child);
        self.start_llama_cpp_server(app, &model_id, arguments, wpid, wstatus, command_child).await?;

        Ok(Payload { status: status_response, message: self.name.to_string() })
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
                .emit_all("opla-server", Payload {
                    message: format!("Opla server to stop: {} ", "llama.cpp.server"),
                    status: ServerStatus::Stopping.as_str().to_string(),
                })
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
                .emit_all("opla-server", Payload {
                    message: format!("Opla server killed: {} ", "llama.cpp.server"),
                    status: ServerStatus::Stopped.as_str().to_string(),
                })
                .map_err(|err| err.to_string())?;
            let mut wstatus = match self.status.try_lock() {
                Ok(status) => status,
                Err(_) => {
                    println!("Opla server error try to write status");
                    return Err("Opla server can't write status".to_string());
                }
            };
            *wstatus = ServerStatus::Stopped;
            return Ok(Payload {
                status: wstatus.as_str().to_string(),
                message: self.name.to_string(),
            });
        }
        Ok(Payload { status: status.to_string(), message: self.name.to_string() })
    }

    fn kill_previous_processes(&mut self) {
        let sys = System::new_all();
        let mut pid: u32 = 0;
        let mut started = false;
        let mut name;
        // This will not work in Apple Macos sandbox
        for process in sys.processes_by_name("llama.cpp.server") {
            if pid == 0 && !started {
                pid = process.pid().as_u32();
                started = true;
                name = process.name();
                println!("Opla server previously started {}", name);
            }
            println!("Opla server kill zombie {} / {}", process.pid(), process.name());
            process.kill();
        }
    }

    pub fn init(&mut self, store_server: ServerConfiguration) {
        Self::sysinfo_test();
        self.kill_previous_processes();
        self.parameters = Some(store_server.parameters);
    }

    pub async fn bind<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        parameters: &ServerParameters
    ) -> Result<(), Box<dyn std::error::Error>> {
        if !parameters.has_same_model(&self.parameters) {
            self.stop(&app).await?;
            let self_status = Arc::clone(&self.status);
            let mut wouldblock = true;
            let _ = self.start(app, &parameters).await?;

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

    pub async fn cancel_completion(&mut self, conversation_id: &str) -> Result<(), String> {
            let mut handles = self.completion_handles.lock().await;
            let handle = handles.remove(conversation_id);
            match handle {
                Some(h) => {
                    h.abort();
                },
                None => {
                    let err = format!("cancel_completion Handle not found {}", conversation_id);
                    println!("{}",err);
                    return Err(err);
                }
            }
            drop(handles);
            Ok(())
    }

    pub async fn call_completion<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        model: String,
        model_path: String,
        query: LlmQuery<LlmQueryCompletion>,
        completion_options: Option<LlmCompletionOptions>,
    ) -> Result<LlmCompletionResponse, String> {
        println!("{}", format!("Opla llm call: {:?} / {:?}", query.command, &model));
        let query = query.clone();
        let conversation_id = query.options.conversation_id.clone();
        let parameters = match self.parameters.clone() {
            Some(mut p) => {
                p.model_id = Some(model.clone());
                p.model_path = Some(model_path);
                p
            }
            None => {
                return Err(
                    LlmError::new(
                        "Opla server not started no parameters found",
                        "server_error"
                    ).to_string()
                );
            }
        };
        let is_stream = query.options.get_parameter_as_boolean("stream").unwrap_or(false);
        self.bind::<R>(app.app_handle(), &parameters).await.map_err(|err| err.to_string())?;

        let (sender, mut receiver) = channel::<Result<LlmCompletionResponse, LlmError>>(1);

        let query = query.clone();
        let mut client_instance = self.inference_client.create(&self.parameters);

        let handle = spawn(async move {
            client_instance.call_completion(&query, completion_options.clone(), sender).await
        });

        {
            let mut handles = self.completion_handles.lock().await;
            handles.insert(
                conversation_id.clone().unwrap_or(String::from("default")),
                Arc::new(handle)
            );
            drop(handles);
        }
        let mut result: Result<LlmCompletionResponse, String> = Err(
            String::from("Not initialized")
        );
        while let Some(response) = receiver.recv().await {
            result = match response {
                Ok(response) => {
                    let mut response = response.clone();
                    response.conversation_id = conversation_id.clone();
                    if is_stream {
                        let _ = app
                            .emit_all("opla-sse", response.clone())
                            .map_err(|err| err.to_string());
                    }
                    Ok(response.clone())
                }
                Err(err) => {
                    if is_stream {
                        let _ = app
                            .emit_all("opla-sse", Payload {
                                message: err.to_string(),
                                status: ServerStatus::Error.as_str().to_string(),
                            })
                            .map_err(|err| err.to_string());
                    }
                    Err(err.to_string())
                }
            };
        }
        {
            let mut handles = self.completion_handles.lock().await;
            handles.remove(&conversation_id.clone().unwrap_or(String::from("default")));
            drop(handles);
        }
        result
    }

    pub async fn call_tokenize<R: Runtime>(
        &mut self,
        model: &str,
        text: String
    ) -> Result<LlmTokenizeResponse, Box<dyn std::error::Error>> {
        println!("{}", format!("Opla llm call tokenize: {:?}", &model));
        self.inference_client.call_tokenize::<R>(text).await
    }
}
