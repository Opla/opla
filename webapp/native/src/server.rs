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
use sysinfo::{ ProcessExt, System, SystemExt, PidExt, Pid };
use tauri::{ api::process::{ Command, CommandEvent }, Runtime, Manager };

#[derive(Clone, serde::Serialize)]
pub struct OplaServerResponse {
    pub status: String,
    pub message: String,
}

#[derive(Clone)]
pub struct OplaServer {
    pub pid: Arc<Mutex<usize>>,
    pub name: String,
    pub status: Arc<Mutex<ServerStatus>>,
}

#[derive(Clone, serde::Serialize, Copy)]
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

#[derive(Clone, serde::Serialize)]
pub struct Payload {
    pub message: String,
    pub status: String,
}

pub struct OplaState {
    pub server: Mutex<OplaServer>,
}

impl OplaServer {
    pub fn new() -> Self {
        OplaServer {
            pid: Arc::new(Mutex::new(0)),
            name: "llama.cpp.server".to_string(),
            status: Arc::new(Mutex::new(ServerStatus::Init)),
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
        println!("System name:             {:?}", sys.name());
        println!("System kernel version:   {:?}", sys.kernel_version());
        println!("System OS version:       {:?}", sys.os_version());
        println!("System host name:        {:?}", sys.host_name());

        // Number of CPUs:
        println!("NB CPUs: {}", sys.cpus().len());
    }

    pub fn start_llama_cpp_server<EventLoopMessage: Runtime + 'static>(
        app: tauri::AppHandle<EventLoopMessage>,
        arguments: Vec<String>,
        do_started: Box<dyn (Fn(usize) -> ()) + Send>,
        callback: Box<dyn (Fn(ServerStatus) -> ()) + Send>
    ) {
        let command = Command::new_sidecar("llama.cpp.server").expect(
            "failed to init llama.cpp.server"
        );

        tauri::async_runtime::spawn(async move {
            let (mut rx, child) = command
                .args(arguments)
                .spawn()
                .expect("failed to execute llama.cpp.server");
            println!("Opla server started: {} / {}", "0", "llama.cpp.server");
            app.emit_all("opla-server", Payload {
                message: format!("Opla server started: {} / {}", "0", "llama.cpp.server"),
                status: ServerStatus::Starting.as_str().to_string(),
            }).unwrap();
            let p: usize = child.pid().try_into().expect("can't convert pid");
            do_started(p);
            while let Some(event) = rx.recv().await {
                if let CommandEvent::Stdout(line) = event {
                    println!("{}", line);
                    app.emit_all("opla-server-stdout", Payload {
                        message: line.clone(),
                        status: "new-line".to_string(),
                    }).unwrap();
                } else if let CommandEvent::Stderr(line) = event {
                    println!("\x1b[93m{}\x1b[0m", line);
                    app.emit_all("opla-server-sterr", Payload {
                        message: line.clone(),
                        status: "new-line".to_string(),
                    }).unwrap();

                    if line.starts_with("llama server listening") {
                        println!("Opla server started: {}", "llama.cpp.server");
                        app.emit_all("opla-server", Payload {
                            message: format!(
                                "Opla server started: {} / {}",
                                "0",
                                "llama.cpp.server"
                            ),
                            status: ServerStatus::Started.as_str().to_string(),
                        }).unwrap();

                        callback(ServerStatus::Started);
                    }

                    if line.starts_with("error") {
                        println!("Opla server error: {}", line);
                        app.emit_all("opla-server", Payload {
                            message: format!("Opla server error: {}", line),
                            status: ServerStatus::Error.as_str().to_string(),
                        }).unwrap();

                        callback(ServerStatus::Error);
                    }
                }
            }
        });
    }

    pub fn start<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>,
        arguments: [&str; 12]
    ) -> Result<OplaServerResponse, String> {
        let status = match self.status.try_lock() {
            Ok(status) => status.as_str(),
            Err(_) => {
                println!("Opla server error try to read status");
                return Err("Opla server can't read status".to_string());
            }
        };

        if
            status == ServerStatus::Started.as_str().to_string() ||
            status == ServerStatus::Starting.as_str().to_string()
        {
            println!("Opla server already started {}", status);
            return Ok(OplaServerResponse {
                status: status.to_string(),
                message: "llama.cpp.server".to_string(),
            });
        }
        println!("Opla try to start c");
        let mut wstatus = match self.status.try_lock() {
            Ok(status) => status,
            Err(_) => {
                println!("Opla server error try to write status");
                return Err("Opla server can't write status".to_string());
            }
        };
        *wstatus = ServerStatus::Starting;
        let status_response = wstatus.as_str().to_string();
        app.emit_all("opla-server", Payload {
            message: format!("Opla server starting: {} ", "llama.cpp.server"),
            status: "waiting".to_string(),
        }).unwrap();
        drop(wstatus);

        let wpid = Arc::clone(&self.pid);
        let do_started: Box<dyn Fn(usize) + Send> = Box::new(move |pid: usize| {
            println!("Opla server just started: {} / {}", pid, "llama.cpp.server");
            let mut wp = wpid.lock().unwrap();
            *wp = pid;
            drop(wp);
        }) as Box<dyn Fn(usize) + Send>;

        let wstatus = Arc::clone(&self.status);
        let callback = Box::new(move |status| {
            let mut st = wstatus.lock().unwrap();
            *st = status;
            drop(st);
        });
        let arguments: Vec<String> = arguments
            .iter()
            .map(|&arg| arg.to_string())
            .collect();
        OplaServer::start_llama_cpp_server(app, arguments, do_started, callback);

        Ok(OplaServerResponse { status: status_response, message: self.name.to_string() })
    }

    pub fn stop<R: Runtime>(
        &mut self,
        app: tauri::AppHandle<R>
    ) -> Result<OplaServerResponse, String> {
        let pid = self.pid.lock().unwrap().to_owned();
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
            app.emit_all("opla-server", Payload {
                message: format!("Opla server to stop: {} ", "llama.cpp.server"),
                status: ServerStatus::Stopping.as_str().to_string(),
            }).unwrap();

            let sys = System::new_all();
            let pid = self.pid.lock().unwrap().to_owned();
            let process = sys.process(Pid::from(pid)).expect("can't get process");
            process.kill();
            println!("Kill Opla server {}", pid);
            app.emit_all("opla-server", Payload {
                message: format!("Opla server killed: {} ", "llama.cpp.server"),
                status: ServerStatus::Stopped.as_str().to_string(),
            }).unwrap();
            let mut wstatus = match self.status.try_lock() {
                Ok(status) => status,
                Err(_) => {
                    println!("Opla server error try to write status");
                    return Err("Opla server can't write status".to_string());
                }
            };
            *wstatus = ServerStatus::Stopped;
            return Ok(OplaServerResponse {
                status: wstatus.as_str().to_string(),
                message: self.name.to_string(),
            });
        }
        Ok(OplaServerResponse { status: status.to_string(), message: self.name.to_string() })
    }

    pub fn init(&mut self) {
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
    }
}
