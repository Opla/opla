// Copyright 2024 mik
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
use sysinfo::System;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Cpu {
    pub usage: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Sys {
    pub name: String,
    pub kernel_version: String,
    pub os_version: String,
    pub cpu_arch: String,
    
    pub total_memory: u64,
    pub used_memory: u64,
    pub total_swap: u64,
    pub used_swap: u64,

    pub cpus: Vec<Cpu>,
}

impl Sys {
    pub fn new() -> Self {
        let sys = System::new_all();
        Self {
            name: System::name().unwrap_or("Unknown".to_owned()),
            kernel_version: System::kernel_version().unwrap_or("Unknown".to_owned()),
            os_version: System::long_os_version().unwrap_or("Unknown".to_owned()),
            cpu_arch: System::cpu_arch().unwrap_or("Unknown".to_owned()),
            total_memory: sys.total_memory(),
            used_memory: sys.used_memory(),
            total_swap: sys.total_swap(),
            used_swap: sys.used_swap(),
            cpus: sys.cpus().iter().map(|cpu| Cpu { usage: cpu.cpu_usage() }).collect(),
        }
    }

    pub fn refresh(&mut self) {
        let mut sys = System::new();
        sys.refresh_cpu();
        self.cpus = sys.cpus().iter().map(|cpu| Cpu { usage: cpu.cpu_usage() }).collect();
    }
}