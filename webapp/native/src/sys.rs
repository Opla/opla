// Copyright 2024 Mik Bry
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
use serde::{ Deserialize, Serialize };

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Cpu {
    pub usage: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SysInfos {
    pub name: String,
    pub kernel_version: String,
    pub os_version: String,
    pub cpu_arch: String,

    pub total_memory: u64,
    pub used_memory: u64,
    pub total_swap: u64,
    pub used_swap: u64,

    pub cpus: Vec<Cpu>,
    pub global_cpu_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Sys {
    #[serde(skip)]
    sys: System,
    infos: SysInfos,
}

impl Sys {
    pub fn new() -> Self {
        let mut sys = System::new_with_specifics(
            sysinfo::RefreshKind
                ::new()
                .with_memory(sysinfo::MemoryRefreshKind::everything())
                .with_cpu(sysinfo::CpuRefreshKind::everything())
        );
        sys.refresh_all();
        let infos = SysInfos {
            name: System::name().unwrap_or("Unknown".to_owned()),
            kernel_version: System::kernel_version().unwrap_or("Unknown".to_owned()),
            os_version: System::long_os_version().unwrap_or("Unknown".to_owned()),
            cpu_arch: System::cpu_arch().unwrap_or("Unknown".to_owned()),
            total_memory: sys.total_memory(),
            used_memory: sys.used_memory(),
            total_swap: sys.total_swap(),
            used_swap: sys.used_swap(),
            cpus: sys
                .cpus()
                .iter()
                .map(|cpu| Cpu { usage: cpu.cpu_usage() })
                .collect(),
            global_cpu_percentage: sys.global_cpu_info().cpu_usage() as f64,
        };
        Self {
            sys,
            infos,
        }
    }

    pub fn refresh(&mut self) -> SysInfos {
        self.sys.refresh_specifics(
            sysinfo::RefreshKind
                ::new()
                .with_memory(sysinfo::MemoryRefreshKind::everything())
                .with_cpu(sysinfo::CpuRefreshKind::everything())
        );
        self.infos.global_cpu_percentage = self.sys.global_cpu_info().cpu_usage() as f64;
        self.infos.used_memory = self.sys.used_memory();
        self.infos.used_swap = self.sys.used_swap();
        self.infos.cpus = self.sys
            .cpus()
            .iter()
            .map(|cpu| {
                cpu.cpu_usage();
                let usage = cpu.cpu_usage();
                return Cpu { usage };
            })
            .collect();
        self.infos.global_cpu_percentage = self.sys.global_cpu_info().cpu_usage() as f64;

        return self.infos.clone();
    }
}
