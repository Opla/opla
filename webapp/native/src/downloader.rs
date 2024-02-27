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

use std::{ cmp::min, collections::HashMap, error::Error, fs::File, io::Write, time::Instant };

use reqwest::Response;
use serde::{ Serialize, Deserialize };
use tauri::{ async_runtime::JoinHandle, AppHandle, Manager, Runtime };

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Download {
    pub id: String,
    pub file_name: String,
    pub file_size: u64,
    pub transfered: u64,
    pub transfer_rate: f64,
    pub percentage: f64,
    pub error: Option<String>,
}

impl Download {
    pub fn emit_progress<R: Runtime>(&self, handle: &AppHandle<R>) {
        let payload = ("progress", &self);
        handle.emit_all("opla-downloader", payload).ok();
    }

    pub fn emit_finished<R: Runtime>(&self, handle: &AppHandle<R>) {
        let payload = ("finished", &self);
        handle.emit_all("opla-downloader", payload).ok();
    }

    pub fn emit_canceled<R: Runtime>(&self, handle: &AppHandle<R>) {
        let payload = ("canceled", &self);
        handle.emit_all("opla-downloader", payload).ok();
    }

    pub fn emit_error<R: Runtime>(&mut self, handle: &AppHandle<R>, error: Box<dyn Error>) {
        self.error = Some(error.to_string());
        let payload = ("error", &self, error.to_string());
        handle.emit_all("opla-downloader", payload).ok();
    }
}

pub struct Downloader {
    pub downloads: Vec<Download>,
    handles: HashMap<String, JoinHandle<()>>,
}

const UPDATE_SPEED: u128 = 50;

impl Downloader {
    pub fn new() -> Self {
        Downloader {
            downloads: Vec::new(),
            handles: HashMap::new(),
        }
    }

    pub fn download_file<EventLoopMessage: Runtime + 'static>(
        &mut self,
        id: String,
        url: String,
        path: String,
        file_name: &str,
        handle: AppHandle<EventLoopMessage>
    ) -> () {
        println!("Downloading {}...", url);
        let file_name = file_name.to_string();

        let mut download = Download {
            id: id.to_string(),
            file_name: file_name.to_string(),
            file_size: 0,
            transfered: 0,
            transfer_rate: 0.0,
            percentage: 0.0,
            error: None,
        };
        self.downloads.push(download.clone());
        let join_handle = tauri::async_runtime::spawn(async move {
            let start_time = Instant::now();

            let mut file = match File::create(path.clone()) {
                Ok(file) => file,
                Err(error) => {
                    println!("Failed to create file: {} {}", path, error);
                    download.emit_error(&handle, Box::new(error));
                    return;
                }
            };

            let response = match reqwest::get(url).await {
                Ok(res) => res,
                Err(error) => {
                    println!("Failed to download ressource: {}", error);
                    download.emit_error(&handle, Box::new(error));
                    return;
                }
            };

            Downloader::download_chunks(
                &mut download,
                &file,
                response,
                start_time,
                &handle
            ).await.ok();
            match file.flush() {
                Ok(_) => {}
                Err(error) => {
                    println!("Failed to finish download: {}", error);
                    download.emit_error(&handle, Box::new(error));
                    return;
                }
            }
            download.emit_finished(&handle);
        });
        self.handles.insert(id, join_handle);
    }

    async fn download_chunks<R: Runtime>(
        download: &mut Download,
        mut file: &File,
        mut response: Response,
        start_time: Instant,
        handle: &AppHandle<R>
    ) -> Result<(), Box<dyn Error>> {
        let mut last_update = Instant::now();
        download.file_size = response.content_length().unwrap_or_else(|| 0);

        while let Some(chunk) = response.chunk().await? {
            let res = file.write_all(&chunk);
            match res {
                Ok(_) => {}
                Err(error) => {
                    println!("Failed to write chunk: {}", error);
                    download.emit_error(&handle, Box::new(error));
                    break;
                }
            }
            download.transfered = min(
                download.transfered + (chunk.len() as u64),
                download.file_size
            );
            let duration = start_time.elapsed().as_secs_f64();
            let speed = if duration > 0.0 {
                (download.transfered as f64) / duration / 1024.0 / 1024.0
            } else {
                0.0
            };
            download.percentage = ((download.transfered * 100) / download.file_size) as f64;
            download.transfer_rate =
                (download.transfered as f64) / (start_time.elapsed().as_secs() as f64) +
                ((start_time.elapsed().subsec_nanos() as f64) / 1_000_000_000.0).trunc();

            if last_update.elapsed().as_millis() >= UPDATE_SPEED {
                download.emit_progress(&handle);
                last_update = std::time::Instant::now();
            }

            println!(
                "Downloaded {:.2} MB at {:.2} MB/s total: {:.2} MB",
                (download.transfered as f64) / 1024.0 / 1024.0,
                speed,
                (download.file_size as f64) / 1024.0 / 1024.0
            );
        }
        println!("Download finished");
        Ok(())
    }

    pub fn cancel_download<R: Runtime>(&mut self, id: &str, app_handle: &AppHandle<R>) -> () {
        if let Some(handle) = self.handles.remove(id) {
            handle.abort();
            if let Some(download) = self.downloads.iter_mut().find(|d| d.id == id) {
                download.emit_canceled(&app_handle);
            }
        }
    }
}
