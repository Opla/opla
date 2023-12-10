#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use sysinfo::{ProcessExt, System, SystemExt};

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
fn start_opla_daemon() {
  /* let mut child = Command::new("oplad")
    .arg("-d")
    .spawn()
    .expect("failed to execute child");

  child.wait().expect("failed to wait on child"); */
  sysinfo_test();
  let sys = System::new_all();
  for process in sys.processes_by_exact_name("llama.cpp.server") {
      println!("{} {}", process.pid(), process.name());
  }
}

fn main() {
  start_opla_daemon();
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
