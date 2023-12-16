#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

enum ServerStatus {
  Init,
  Wait,
  Starting,
  Started,
  Stopping,
  Stopped,
  Error,
}

impl ServerStatus {
  fn as_str(&self) -> &'static str {
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

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize)]
struct Payload {
  message: String,
  status: String,
}

struct OplaServer {
  pid: Mutex<usize>,
  name: String,
  status: RwLock<ServerStatus>,
}

struct OplaState {
  server: Arc<OplaServer>,
}

use std::sync::{Mutex, RwLock, Arc};

use sysinfo::{ProcessExt, System, SystemExt, Pid, PidExt};
use tauri::{api::process::{Command, CommandEvent, CommandChild}, Runtime, State, Manager};

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

fn start_llama_cpp_server<R: Runtime>(app: tauri::AppHandle<R>, arguments: [&str; 12]) -> CommandChild {

  app.emit_all("opla-server", Payload {
    message: format!("Opla server starting: {} ", "llama.cpp.server"),
    status: "waiting".to_string(),
  }).unwrap();

  let command = Command::new_sidecar("llama.cpp.server").expect("failed to init llama.cpp.server");
  let (mut rx, child) = command.args(arguments).spawn().expect("failed to execute llama.cpp.server");
  tauri::async_runtime::spawn(async move {
    println!("Opla server started: {} / {}", "0", "llama.cpp.server");
    app.emit_all("opla-server", Payload {
      message: format!("Opla server started: {} / {}", "0", "llama.cpp.server"),
      status: "started".to_string(),
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
              status: "started".to_string(),
            }).unwrap();
            let opla = app.state::<OplaState>();
            let mut wstatus = opla.server.status.write().expect("Opla server can't write status");
            *wstatus = ServerStatus::Started;
          }

          if line.starts_with("error") {
            println!("Opla server error: {}", line);
            app.emit_all("opla-server", Payload {
              message: format!("Opla server error: {}", line),
              status: "error".to_string(),
            }).unwrap();
            let opla = app.state::<OplaState>();
            let mut wstatus = opla.server.status.write().expect("Opla server can't write status");
            *wstatus = ServerStatus::Error;
          }
      }
  }
  });
  child
}

fn init_opla() -> OplaState {
  sysinfo_test();
  let sys = System::new_all();
  let mut pid: u32 = 0;
  let mut started = false;
  let mut name = "llama.cpp.server";
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
  OplaState {
    server: Arc::new(OplaServer {
      pid: Mutex::new(0),
      name: name.to_string(),
      status: RwLock::new(ServerStatus::Init),
    })
  }
}

#[derive(serde::Serialize)]
struct OplaServerResponse {
  status: String,
  message: String,
}

#[tauri::command]
async fn start_opla_server<R: Runtime>(app: tauri::AppHandle<R>, 
  _window: tauri::Window<R>, 
  opla_app: State<'_, OplaState>,
  model: String,
  port: i32,
  host: String,
  context_size: i32,
  threads: i32,
  n_gpu_layers: i32,
  ) -> Result<OplaServerResponse, String> {
    println!("Opla try to start ");
    let server : &OplaServer = &opla_app.server;
  let status = match server.status.try_read(){ 
    Ok(status) => status.as_str(),
    Err(_) => {
      println!("Opla server error try to read status");
      return Err("Opla server can't read status".to_string());
    }
  };

  if status == "started"  || status == "starting" {
    println!("Opla server already started {}", status);
    /* app.emit_all("opla-server", Payload {
      message: format!("Opla server {}: {}", status.to_owned(), "llama.cpp.server"),
      status: status.to_owned(),
    }).unwrap(); */
    return Ok(OplaServerResponse{ status: status.to_string(), message: "llama.cpp.server".to_string() });
  }
  println!("Opla try to start c");
  let mut wstatus = match server.status.try_write(){ 
    Ok(status) => status,
    Err(_) => {
      println!("Opla server error try to write status");
      return Err("Opla server can't write status".to_string());
    }
  };
  *wstatus = ServerStatus::Starting;
  
  let child = start_llama_cpp_server(app, [
    "-m",
    model.as_str(),
    "--port",
    &port.to_string(),
    "--host",
    host.as_str(),
    "-c",
    &context_size.to_string(),
    "-t",
    &threads.to_string(),
    "-ngl",
    &n_gpu_layers.to_string(),
  ]);
  let mut pid = server.pid.lock().expect("can't get Pid");
  *pid = child.pid().try_into().expect("can't convert pid");

  Ok(OplaServerResponse { status: wstatus.as_str().to_string(), message: server.name.to_string() })
}

#[tauri::command]
async fn stop_opla_server<R: Runtime>(app: tauri::AppHandle<R>, _window: tauri::Window<R>, opla_app: State<'_, OplaState>) -> Result<OplaServerResponse, String> {
  let server : &OplaServer = &opla_app.server;
  let pid = server.pid.lock().expect("can't get Pid");
  let status = match server.status.try_read(){ 
    Ok(status) => status.as_str(),
    Err(_) => {
      println!("Opla server error try to read status");
      return Err("Opla server can't read status".to_string());
    }
  };
  if status == "started" && pid.to_owned() != 0 {
    let mut wstatus = match server.status.try_write(){ 
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
      status: "stopping".to_string(),
    }).unwrap();
    let sys = System::new_all();
    let process = sys.process(Pid::from(pid.to_owned())).expect("can't get process");
    process.kill();
    println!("Kill Opla server {}", pid);
    app.emit_all("opla-server", Payload {
      message: format!("Opla server killed: {} ", "llama.cpp.server"),
      status: "stopped".to_string(),
    }).unwrap();
    let mut wstatus = match server.status.try_write(){ 
      Ok(status) => status,
      Err(_) => {
        println!("Opla server error try to write status");
        return Err("Opla server can't write status".to_string());
      }
    };
    *wstatus = ServerStatus::Stopped;
    return Ok((OplaServerResponse { status: wstatus.as_str().to_string(), message: server.name.to_string() }));
  }
  Ok((OplaServerResponse { status: status.to_string(), message: server.name.to_string() }))
}

fn main() {
  let opla_app: OplaState = init_opla();
  tauri::Builder::default()
  .manage(opla_app)
  .setup(|app| {
    app.emit_all("opla-server", Payload { message: "Init Opla backend".into(), status: "ok".to_owned() }).unwrap();
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![start_opla_server, stop_opla_server])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
