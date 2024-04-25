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

use crate::{ hash::Hasher, OplaContext };

use std::{ cmp::min, collections::HashMap, error::Error, fmt, fs::File, io::Write, time::Instant };

use reqwest::Response;
use serde::{ Serialize, Deserialize };
use tauri::{ AppHandle, Manager, Runtime };
use tokio::{spawn, task::JoinHandle};

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

#[derive(Debug, Clone)]
struct DownloadError {
    details: String,
}

impl DownloadError {
    fn new(msg: &str) -> DownloadError {
        DownloadError { details: msg.to_string() }
    }
}

impl fmt::Display for DownloadError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.details)
    }
}

impl Error for DownloadError {
    fn description(&self) -> &str {
        &self.details
    }
}

impl Download {
    pub fn emit_progress<R: Runtime>(&self, handle: &AppHandle<R>) {
        let payload = ("progress", &self);
        handle.emit_all("opla-downloader", payload).ok();
        handle.trigger_global("opla-downloader", Some(format!("progress:{}", self.id.clone())));
    }

    pub fn emit_finished<R: Runtime>(&self, handle: &AppHandle<R>) {
        let payload = ("finished", &self);
        handle.emit_all("opla-downloader", payload).ok();
        handle.trigger_global("opla-downloader", Some(format!("ok:{}", self.id.clone())));
    }

    pub fn emit_canceled<R: Runtime>(&self, handle: &AppHandle<R>) {
        let payload = ("canceled", &self);
        handle.emit_all("opla-downloader", payload).ok();
        handle.trigger_global("opla-downloader", Some(format!("canceled:{}", self.id.clone())));
    }

    pub fn emit_error<R: Runtime>(&mut self, handle: &AppHandle<R>, error: Box<dyn Error>) {
        self.error = Some(error.to_string());
        let payload = ("error", &self, error.to_string());
        handle.emit_all("opla-downloader", payload).ok();
        handle.trigger_global("opla-downloader", Some(format!("error:{}", self.id.clone())));
    }
}

pub struct Downloader {
    pub downloads: Vec<Download>,
    handles: HashMap<String, JoinHandle<()>>,
    hashes: HashMap<String, Hasher>,
}

const UPDATE_SPEED: u128 = 50;

impl Downloader {
    pub fn new() -> Self {
        Downloader {
            downloads: Vec::new(),
            handles: HashMap::new(),
            hashes: HashMap::new(),
        }
    }

    async fn update_downloaded_model<EventLoopMessage: Runtime + 'static>(
        id: &String,
        state: String,
        handle: &AppHandle<EventLoopMessage>
    ) {
        let context = handle.state::<OplaContext>();
        let mut downloader = context.downloader.lock().await;
        downloader.finish_download(id);
        let mut store = context.store.lock().await;
        store.models.set_model_state(id, &state);
        let _ = store.save();
    }

    pub fn download_file<EventLoopMessage: Runtime + 'static>(
        &mut self,
        id: String,
        url: String,
        path: String,
        file_name: &str,
        sha: Option<String>,
        file_size: u64,
        handle: AppHandle<EventLoopMessage>
    ) -> () {
        println!("Downloading {}...", url);

        let file_name = file_name.to_string();

        let mut hasher = Hasher::new(sha);
        self.hashes.insert(id.to_string(), hasher.clone());
        // println!("hasher {:?}", hasher);
        let mut download = Download {
            id: id.to_string(),
            file_name: file_name.to_string(),
            file_size,
            transfered: 0,
            transfer_rate: 0.0,
            percentage: 0.0,
            error: None,
        };
        self.downloads.push(download.clone());
        let nid = id.clone();
        let join_handle = spawn(async move {
            let start_time = Instant::now();
            let mut file = match File::create(path.clone()) {
                Ok(file) => file,
                Err(error) => {
                    println!("Failed to create file: {} {}", path, error);
                    Downloader::update_downloaded_model(&id, "error".to_string(), &handle).await;
                    download.emit_error(&handle, Box::new(error));
                    return;
                }
            };

            let response = match reqwest::get(url).await {
                Ok(res) => res,
                Err(error) => {
                    println!("Failed to download ressource: {}", error);
                    Downloader::update_downloaded_model(&id, "error".to_string(), &handle).await;
                    download.emit_error(&handle, Box::new(error));
                    return;
                }
            };
            Downloader::download_chunks(
                &mut download,
                &file,
                response,
                start_time,
                &handle,
                &mut hasher
            ).await.ok();
            match file.flush() {
                Ok(_) => {}
                Err(error) => {
                    println!("Failed to finish download: {}", error);
                    Downloader::update_downloaded_model(&id, "error".to_string(), &handle).await;
                    download.emit_error(&handle, Box::new(error));
                    return;
                }
            }
            let id = download.id.to_string();
            println!(
                "Download finished {} {} {} {}",
                id,
                file_size,
                download.file_size,
                download.transfered
            );

            if download.file_size != download.transfered {
                println!("Wrong uploaded file size {}", id);
                Downloader::update_downloaded_model(&id, "error".to_string(), &handle).await;
                download.emit_error(&handle, Box::new(DownloadError::new("Wrong uploaded file size")));
                return;
            }

            if !hasher.compare_signature() {
                println!("Wrong checksum {}", id);
                Downloader::update_downloaded_model(&id, "error".to_string(), &handle).await;
                download.emit_error(&handle, Box::new(DownloadError::new("Wrong checksum")));
                return;
            }

            Downloader::update_downloaded_model(&id, "ok".to_string(), &handle).await;
            download.emit_finished(&handle);
        });
        self.handles.insert(nid.to_string(), join_handle);
    }

    async fn download_chunks<R: Runtime>(
        download: &mut Download,
        mut file: &File,
        mut response: Response,
        start_time: Instant,
        handle: &AppHandle<R>,
        hasher: &mut Hasher
    ) -> Result<(), Box<dyn Error>> {
        let mut last_update = Instant::now();

        let file_size = response.content_length().unwrap_or(1);
        println!("download chunks {} {}", file_size, download.file_size);
        if download.file_size != 0 && file_size != download.file_size {
            println!("Wrong file size: {}", file_size);
            let error = Box::new(DownloadError::new(&format!("Wrong file size: {}", file_size)));
            download.emit_error(&handle, error.clone());
            return Err(error);
        } else {
            download.file_size = file_size;
        }
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
            hasher.update(&chunk);
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
        Ok(())
    }

    pub fn finish_download(&mut self, id: &str) -> () {
        println!("finish download removes hashes and handles {}", id);
        self.hashes.remove(id);
        self.handles.remove(id);
    }

    pub fn cancel_download<R: Runtime>(&mut self, id: &str, app_handle: &AppHandle<R>) -> () {
        self.hashes.remove(id);
        if let Some(handle) = self.handles.remove(id) {
            handle.abort();
            if let Some(download) = self.downloads.iter_mut().find(|d| d.id == id) {
                download.emit_canceled(&app_handle);
            }
        }
    }
}
