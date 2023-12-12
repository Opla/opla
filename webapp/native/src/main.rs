#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

struct OplaServer {
  pid: Mutex<usize>,
  name: Mutex<String>,
  started: Mutex<bool>,
}

struct OplaApp {
  server: OplaServer,
}

use std::sync::Mutex;

use sysinfo::{ProcessExt, System, SystemExt, Pid, PidExt};
use tauri::{api::process::{Command, CommandEvent, CommandChild}, Runtime, State, async_runtime::Receiver};

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

fn start_llama_cpp_server(arguments: [&str; 12]) -> CommandChild {
  let command = Command::new_sidecar("llama.cpp.server").expect("failed to init llama.cpp.server");
  let (mut rx, child) = command.args(arguments).spawn().expect("failed to execute llama.cpp.server");
  tauri::async_runtime::spawn(async move {
    while let Some(event) = rx.recv().await {
      if let CommandEvent::Stdout(line) = event {
        println!("{}", line);
          /* window.emit("opla-server-stdout", Payload {
              message: line,
          }); */
      }
      else if let CommandEvent::Stderr(line) = event {
        println!("\x1b[93m{}\x1b[0m", line);
          /* window.emit("opla-server-sterr", Payload {
              message: line,
          }); */
      }
  }
  });
  println!("Opla server started: {} / {}", child.pid(), "llama.cpp.server");
  
  child
}

fn init_opla() -> OplaApp {
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
  OplaApp {
    server: OplaServer {
      pid: Mutex::new(0),
      name: Mutex::new(name.to_string()),
      started: Mutex::new(started),
    }
  }
}

#[tauri::command]
async fn start_opla_server<R: Runtime>(_app: tauri::AppHandle<R>, 
  _window: tauri::Window<R>, 
  opla_app: State<'_, OplaApp>,
  model: String,
  port: i32,
  host: String,
  context_size: i32,
  threads: i32,
  n_gpu_layers: i32,
  ) -> Result<(), String> {
  let mut pid = opla_app.server.pid.lock().expect("can't get Pid");
  if pid.to_owned() != 0 {
    println!("Opla server already started {}", pid);
    return Ok(());
  }

  let child = start_llama_cpp_server([
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
  *pid = child.pid().try_into().expect("can't convert pid");
  Ok(())
}

#[tauri::command]
async fn stop_opla_server<R: Runtime>(_app: tauri::AppHandle<R>, _window: tauri::Window<R>, opla_app: State<'_, OplaApp>) -> Result<(), String> {
  let pid = opla_app.server.pid.lock().expect("can't get Pid");
  if pid.to_owned() != 0 {
    let sys = System::new_all();
    let process = sys.process(Pid::from(pid.to_owned())).expect("can't get process");
    process.kill();
    println!("Kill Opla server {}", pid);
    return Ok(());
  }
  Ok(())
}

fn main() {
  let opla_app = init_opla();
  tauri::Builder::default()
    .manage(opla_app)
    .invoke_handler(tauri::generate_handler![start_opla_server, stop_opla_server])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
