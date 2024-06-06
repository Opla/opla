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

use std::path::PathBuf;
use tokio::fs::write;
use regex::Regex;

/*
    Get from OpenAI, like:
    https://oaidalleapiprodscus.blob.core.windows.net/private/org-3Zz2q33fNpxqauQ1G2nLWLAA/user-snztjEWsxNBt20wFZZAlJ0AS/img-mYG2OCWQELXPKxKFLf5Fc6uj.png?st=2024-06-05T14%3A23%3A13Z&se=2024-06-05T16%3A23%3A13Z&sp=r&sv=2023-11-03&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2024-06-04T18%3A38%3A07Z&ske=2024-06-05T18%3A38%3A07Z&sks=b&skv=2023-11-03&sig=LQoZvDlSxakvM4yVp8oC1Q37zwT9DAxO9NzC6Kc4We0%3D
*/
pub fn get_filename_from_url(url: &str) -> Result<String,String> {
    let re = Regex::new(r"(?:[^?]+/)((.+)[.](\w{2,5}))").map_err(|e| e.to_string())?;
    let caps = match re.captures(url) {
        Some(cps) => cps,
        None => return Err("Not found".to_string()),
    };
    Ok(caps[1].to_string())
}

pub async fn download_image(url: String, path: PathBuf) -> Result<String, String> {
    let response = reqwest::get(url.clone()).await.map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let mut filepath = path.clone();
    let filename = match get_filename_from_url(&url) {
        Ok(f) => f,
        Err(error) => {
            println!("download_image regex error: {:?}", error);
            "image.png".to_string()
        },
    };
    filepath = filepath.join(filename.to_string());
    println!("image {:?} download to {:?}", url, filepath.to_str());
    write(filepath.clone(), bytes).await.map_err(|e| e.to_string())?;
    Ok(filepath.to_str().unwrap_or(&filename).to_string())
}