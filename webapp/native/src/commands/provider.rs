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

use tauri::{ Runtime, State };
use crate::data::provider::Provider;
use crate::providers::ProvidersManager;
use crate::OplaContext;

#[tauri::command]
pub async fn get_provider_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Provider, String> {
    let store = context.store.lock().await;
    let server = store.server.clone();
    let template = ProvidersManager::get_opla_provider(&server);
    Ok(template.clone())
}