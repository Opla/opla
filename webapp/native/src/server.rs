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

use std::sync::{ Mutex, Arc };
use crate::{
    error::Error,
    llm::LlmQueryCompletion,
    llm::llama_cpp::LLamaCppServer,
    store::{ ServerParameters, ServerConfiguration },
};
use sysinfo::{ System, Pid };
use tauri::{ api::process::{ Command, CommandEvent }, Runtime, Manager };
use crate::llm::{ LlmQuery, LlmResponse };
use std::time::Duration;
use std::thread;

#[derive(Clone)]
pub struct OplaServer {
    pub pid: Arc<Mutex<usize>>,
    pub name: String,
    pub model: Option<String>,
    pub model_path: Option<String>,
    pub status: Arc<Mutex<ServerStatus>>,
    pub parameters: Option<ServerParameters>,
    server: LLamaCppServer,
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
        }
    }
}

#[derive(Clone, Debug, serde::Serialize)]
pub struct Payload {
    pub message: String,
    pub status: String,
}

impl OplaServer {
    pub fn new() -> Self {
        OplaServer {
            pid: Arc::new(Mutex::new(0)),
            name: "llama.cpp.server".to_string(),
            status: Arc::new(Mutex::new(ServerStatus::Init)),
            model: None,
            model_path: None,
            parameters: None,
            server: LLamaCppServer::new(),
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

    /* async */ pub fn start_llama_cpp_server<EventLoopMessage: Runtime + 'static>(
        app: tauri::AppHandle<EventLoopMessage>,
        model: &str,
        arguments: Vec<String>,
        do_started: Box<dyn (Fn(usize) -> ()) + Send>,
        callback: Box<dyn (Fn(ServerStatus) -> ()) + Send>
    ) -> Result<(), String> {
        let command = Command::new_sidecar("llama.cpp.server").map_err(
            |_| "failed to init llama.cpp.server"
        )?;

        let model = model.to_string();
        let _future = tauri::async_runtime::spawn(async move {
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
                    callback(ServerStatus::Error);
                    return;
                }
            };
            println!("Opla server started: {} / {}", "0", model);
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
                    callback(ServerStatus::Error);
                    return;
                }
            };
            do_started(p);
            while let Some(event) = rx.recv().await {
                if let CommandEvent::Stdout(line) = event {
                    println!("{}", line);
                    if
                        app
                            .emit_all("opla-server-stdout", Payload {
                                message: line.clone(),
                                status: "new-line".to_string(),
                            })
                            .is_err()
                    {
                        println!("Opla server error: {}", "failed to emit stdout");
                    }
                } else if let CommandEvent::Stderr(line) = event {
                    println!("\x1b[93m{}\x1b[0m", line);
                    if
                        app
                            .emit_all("opla-server-sterr", Payload {
                                message: line.clone(),
                                status: "new-line".to_string(),
                            })
                            .is_err()
                    {
                        println!("Opla server error: {}", "failed to emit stderr");
                    }

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

                        callback(ServerStatus::Started);
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

                        callback(ServerStatus::Error);
                    }
                }
            }
        });
        Ok(())
    }

    pub fn remove_model(&mut self) {
        if self.model.is_some() {
            self.model = None;
            self.model_path = None;
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
        let message = match &self.model {
            Some(model) => model.to_string(),
            None => "None".to_string(),
        };
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

    pub fn set_parameters(
        &mut self,
        model: &str,
        model_path: &str,
        parameters: Option<ServerParameters>
    ) {
        self.parameters = parameters;
        self.model = Some(model.to_string());
        self.model_path = Some(model_path.to_string());
    }

    pub fn start<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        model: &str,
        model_path: &str,
        parameters: Option<&ServerParameters>
    ) -> Result<Payload, String> {
        let status = match self.status.try_lock() {
            Ok(status) => status.as_str(),
            Err(_) => {
                println!("Opla server error try to read status");
                return Err("Opla server can't read status".to_string());
            }
        };
        self.model = Some(model.to_string());
        self.model_path = Some(model_path.to_string());
        let parameters: &ServerParameters = match parameters {
            Some(p) => {
                self.parameters = Some(p.clone());
                &p
            }
            None => {
                match &self.parameters {
                    Some(p) => p, // Dereference the &ServerParameters
                    None => {
                        println!("Opla server error try to read parameters");
                        return Err("Opla server can't read parameters".to_string());
                    }
                }
            }
        };
        let arguments = parameters.to_args(&model_path);

        if
            status == ServerStatus::Started.as_str().to_string() ||
            status == ServerStatus::Starting.as_str().to_string()
        {
            println!("Opla server already started {}", status);
            return Ok(Payload {
                status: status.to_string(),
                message: "llama.cpp.server".to_string(),
            });
        }
        println!("Opla try to start {:?}", self.model);
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
                message: format!("{}", model),
                status: "waiting".to_string(),
            })
            .map_err(|err| err.to_string())?;
        drop(wstatus);

        let wpid = Arc::clone(&self.pid);
        let do_started: Box<dyn Fn(usize) + Send> = Box::new(move |pid: usize| {
            println!("Opla server just started: {}", pid);
            match wpid.lock() {
                Ok(mut p) => {
                    *p = pid;
                }
                Err(_) => {
                    println!("Opla server error try to write pid");
                }
            }
        }) as Box<dyn Fn(usize) + Send>;

        let wstatus = Arc::clone(&self.status);
        let callback = Box::new(move |status| {
            match wstatus.lock() {
                Ok(mut st) => {
                    *st = status;
                }
                Err(_) => {
                    println!("Opla server error try to write status");
                }
            }
        });
        OplaServer::start_llama_cpp_server(app, model, arguments, do_started, callback)?;

        Ok(Payload { status: status_response, message: self.name.to_string() })
    }

    pub fn stop<R: Runtime>(&mut self, app: &tauri::AppHandle<R>) -> Result<Payload, String> {
        let pid = self.pid
            .lock()
            .map_err(|err| err.to_string())?
            .to_owned();
        println!("Opla try to stop {}", pid);
        let status = match self.status.try_lock() {
            Ok(status) => status.as_str(),
            Err(_) => {
                println!("Opla server error try to read status");
                return Err("Opla server can't read status".to_string());
            }
        };
        if status == "started" && pid.to_owned() != 0 {
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

            let sys = System::new_all();
            let pid = self.pid
                .lock()
                .map_err(|err| err.to_string())?
                .to_owned();
            let process = match sys.process(Pid::from(pid)) {
                Some(process) => process,
                None => {
                    println!("Opla server error trying to get process");
                    return Err("Opla server can't get process".to_string());
                }
            };
            process.kill();
            println!("Kill Opla server {}", pid);
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

    pub fn init(&mut self, store_server: ServerConfiguration) {
        Self::sysinfo_test();
        let sys = System::new_all();
        let mut pid: u32 = 0;
        let mut started = false;
        let mut name;
        for process in sys.processes_by_exact_name("llama.cpp.server") {
            if pid == 0 && !started {
                pid = process.pid().as_u32();
                started = true;
                name = process.name();
                println!("Opla server previously started {}", name);
            }
            println!("Opla server kill zombie {} / {}", process.pid(), process.name());
            process.kill();
        }
        self.parameters = Some(store_server.parameters);
    }

    pub async fn call_completion<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        model: &str,
        model_path: &str,
        query: LlmQuery<LlmQueryCompletion>
    ) -> Result<LlmResponse, Box<dyn std::error::Error>> {
        println!(
            "{}",
            format!("Opla llm call:  {:?} / {:?} / {:?}", query.command, self.model, &model)
        );
        if self.model.is_none() || self.model.as_ref().unwrap() != &model {
            self.stop(&app)?;
            let self_status = Arc::clone(&self.status);
            let mut wouldblock = true;
            let _ = self.start(app, model, model_path, None)?;
            let handle = tauri::async_runtime::spawn(async move {
                let mut retries = 0;
                while retries < 20 {
                    let status = match self_status.try_lock() {
                        Ok(status) => status,
                        Err(e) => {
                            //if e.into_inner().kind() == std::io::ErrorKind::WouldBlock {
                            println!("Opla server error try to read status {:?}", e);
                            if wouldblock {
                                // Retry after a short delay
                                thread::sleep(Duration::from_millis(100));
                                wouldblock = false;
                                continue;
                            } else {
                                println!("Opla server error try to read status {:?}", e);
                                return Err(Box::new(Error::ModelNotLoaded));
                            }
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
            });
            // Wait for server to start
            let _ = handle.await;
            println!("Opla server started: available for completion");
        }

        let server_parameters = match &self.parameters {
            Some(p) => p,
            None => {
                println!("Opla server error try to read parameters");
                return Err(Box::new(Error::BadParameters));
            }
        };

        self.server.call_completion::<R>(query, server_parameters).await
    }
}
