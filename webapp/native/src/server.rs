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


use std::sync::{Mutex, Arc};
use sysinfo::{ProcessExt, System, SystemExt, PidExt};
use tauri::{api::process::{Command, CommandEvent}, Runtime, Manager};


#[derive(Clone, serde::Serialize)]
pub struct OplaServerResponse {
  pub status: String,
  pub message: String,
}

#[derive(Clone)]
pub struct OplaServer {
  pub pid: usize,
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
      pid: 0,
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
  
  pub fn start_llama_cpp_server<EventLoopMessage: Runtime>(app: tauri::AppHandle<EventLoopMessage>, arguments: [&str; 12], callback: Box<dyn Fn (ServerStatus) -> () + Send>) -> usize {
  
    let command = Command::new_sidecar("llama.cpp.server").expect("failed to init llama.cpp.server");
    let (mut rx, child) = command.args(arguments).spawn().expect("failed to execute llama.cpp.server");
    tauri::async_runtime::spawn(async move {
      println!("Opla server started: {} / {}", "0", "llama.cpp.server");
      app.emit_all("opla-server", Payload {
        message: format!("Opla server started: {} / {}", "0", "llama.cpp.server"),
        status: ServerStatus::Starting.as_str().to_string(),
      }).unwrap();
  
      while let Some(event) = rx.recv().await {
        if let CommandEvent::Stdout(line) = event {
          println!("{}", line);
            app.emit_all("opla-server-stdout", Payload {
                message: line.clone(),
                status: "new-line".to_string(),
            }).unwrap();
        }
        else if let CommandEvent::Stderr(line) = event {
          println!("\x1b[93m{}\x1b[0m", line);
            app.emit_all("opla-server-sterr", Payload {
                message: line.clone(),
                status: "new-line".to_string(),
            }).unwrap();
  
  
            if line.starts_with("llama server listening") {
              println!("Opla server started: {}", "llama.cpp.server");
              app.emit_all("opla-server", Payload {
                message: format!("Opla server started: {} / {}", "0", "llama.cpp.server"),
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
    child.pid().try_into().expect("can't convert pid")
  }
  
  pub fn start<R: Runtime>(&mut self, app: tauri::AppHandle<R>, arguments: [&str; 12]) -> Result<OplaServerResponse, String> {
    let status = match self.status.try_lock(){ 
        Ok(status) => status.as_str(),
        Err(_) => {
          println!("Opla server error try to read status");
          return Err("Opla server can't read status".to_string());
        }
      };
    
      if status == ServerStatus::Started.as_str().to_string()  || status == ServerStatus::Starting.as_str().to_string() {
        println!("Opla server already started {}", status);
        return Ok(OplaServerResponse{ status: status.to_string(), message: "llama.cpp.server".to_string() });
      }
      println!("Opla try to start c");
      let mut wstatus = match self.status.try_lock(){ 
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

      let wstatus = Arc::clone(&self.status);
      let callback = Box::new(move |status| {
        let mut st = wstatus.lock().unwrap();
        *st = status;
      });
      self.pid = OplaServer::start_llama_cpp_server(app, arguments, callback);


  Ok(OplaServerResponse { status: status_response, message: self.name.to_string() })
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