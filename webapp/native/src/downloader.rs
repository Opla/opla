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

use std::{ fs::File, time::Instant, cmp::min, io::Write, error::Error };

use reqwest::Response;
use serde::{ Serialize, Deserialize };
use tauri::{ AppHandle, Manager, Runtime };

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Progress {
    pub download_id: String,
    pub filesize: u64,
    pub transfered: u64,
    pub transfer_rate: f64,
    pub percentage: f64,
    pub error: Option<String>,
}

impl Progress {
    pub fn emit_progress<R: Runtime>(&self, handle: &AppHandle<R>) {
        handle.emit_all("OPLA_DOWNLOAD_PROGRESS", &self).ok();
    }

    pub fn emit_finished<R: Runtime>(&self, handle: &AppHandle<R>) {
        handle.emit_all("OPLA_DOWNLOAD_FINISHED", &self).ok();
    }

    pub fn emit_error<R: Runtime>(&mut self, handle: &AppHandle<R>, error: Box<dyn Error>) {
        self.error = Some(error.to_string());
        handle.emit_all("OPLA_DOWNLOAD_ERROR", &self).ok();
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Downloader {}

const UPDATE_SPEED: u128 = 50;

impl Downloader {
    pub fn new() -> Self {
        Downloader {}
    }

    pub fn download_file<EventLoopMessage: Runtime + 'static>(
        &self,
        id: String,
        url: String,
        path: String,
        handle: AppHandle<EventLoopMessage>
    ) -> () {
        println!("Downloading {}...", url);
        tauri::async_runtime::spawn(async move {
            let start_time = Instant::now();
            let mut progress = Progress {
                download_id: id.to_string(),
                filesize: 0,
                transfered: 0,
                transfer_rate: 0.0,
                percentage: 0.0,
                error: None,
            };
            let res = File::create(path);
            if res.is_err() {
                let error = res.err().unwrap();
                println!("Failed to create file: {}", error);
                progress.emit_error(&handle, Box::new(error));
                return;
            }
            let mut file = res.unwrap();

            let res = reqwest::get(url).await;
            if res.is_err() {
                let error = res.err().unwrap();
                println!("Failed to download ressource: {}", error);
                progress.emit_error(&handle, Box::new(error));
                return;
            }
            let response = res.unwrap();

            Downloader::download_chunks(
                &mut progress,
                &file,
                response,
                start_time,
                &handle
            ).await.ok();
            let res = file.flush();
            if res.is_err() {
                let error = res.err().unwrap();
                println!("Failed to finish download: {}", error);
                progress.emit_error(&handle, Box::new(error));
                return;
            }
            progress.emit_finished(&handle);
        });
    }

    async fn download_chunks<R: Runtime>(
        progress: &mut Progress,
        mut file: &File,
        mut response: Response,
        start_time: Instant,
        handle: &AppHandle<R>
    ) -> Result<(), Box<dyn Error>> {
        let mut last_update = Instant::now();
        progress.filesize = response.content_length().unwrap_or(0);

        while let Some(chunk) = response.chunk().await? {
            let res = file.write_all(&chunk);
            if res.is_err() {
                let error = Box::new(res.err().unwrap());
                println!("Failed to write chunk: {}", error);
                progress.emit_error(&handle, error);
                break;
            }
            progress.transfered = min(
                progress.transfered + (chunk.len() as u64),
                progress.filesize
            );
            let duration = start_time.elapsed().as_secs_f64();
            let speed = if duration > 0.0 {
                (progress.transfered as f64) / duration / 1024.0 / 1024.0
            } else {
                0.0
            };
            progress.percentage = ((progress.transfered * 100) / progress.filesize) as f64;
            progress.transfer_rate =
                (progress.transfered as f64) / (start_time.elapsed().as_secs() as f64) +
                ((start_time.elapsed().subsec_nanos() as f64) / 1_000_000_000.0).trunc();

            if last_update.elapsed().as_millis() >= UPDATE_SPEED {
                progress.emit_progress(&handle);
                last_update = std::time::Instant::now();
            }

            println!(
                "Downloaded {:.2} MB at {:.2} MB/s total: {:.2} MB",
                (progress.transfered as f64) / 1024.0 / 1024.0,
                speed,
                (progress.filesize as f64) / 1024.0 / 1024.0
            );
        }
        Ok(())
    }
}
