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

use tauri::{ Manager, State };

use crate::{data::message::Message, OplaContext};

#[tauri::command]
pub async fn load_conversation_messages(
    app: tauri::AppHandle,
    _window: tauri::Window,
    context: State<'_, OplaContext>,
    conversation_id: String,
    cache: bool,
) -> Result<Vec<Message>, String> {
    let mut store = context.store.lock().await;
    store.load_conversation_messages(&conversation_id, cache, Some(app.app_handle()))
}

#[tauri::command]
pub async fn save_conversation_messages(
    app: tauri::AppHandle,
    _window: tauri::Window,
    context: State<'_, OplaContext>,
    conversation_id: String,
    messages: Vec<Message>
) -> Result<(), String> {
    let mut store = context.store.lock().await;
    store.save_conversation_messages(&conversation_id, messages, app.app_handle())
}

#[tauri::command]
pub async fn remove_conversation_messages(
    app: tauri::AppHandle,
    _window: tauri::Window,
    context: State<'_, OplaContext>,
    conversation_id: String
) -> Result<(), String> {
    let mut store = context.store.lock().await;
    store.remove_conversation_messages(&conversation_id, app.app_handle())
}