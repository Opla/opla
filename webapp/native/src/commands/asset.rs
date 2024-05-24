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

use tauri::Runtime;
use crate::data::asset::Asset;


#[tauri::command]
pub async fn validate_assets<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    assets: Vec<Asset>
) -> Result<Vec<Asset>, String> {
    let assets = assets
        .iter()
        .map(|asset| {
            let mut asset = asset.clone();
            asset.validate();
            asset
        })
        .collect();

    Ok(assets)
}

#[tauri::command]
pub async fn get_file_asset_extensions<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>
) -> Result<Vec<String>, String> {
    let extensions = Asset::extensions()
        .iter()
        .map(|s| s.to_string())
        .collect();
    Ok(extensions)
}