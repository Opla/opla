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

use tauri::{ Runtime, State };

use crate::{providers::llm::{LlmCompletionOptions, LlmImageGenerationResponse, LlmModelsResponse, LlmQuery, LlmQueryCompletion, LlmTokenizeResponse}, store::Provider, OplaContext};

#[tauri::command]
pub async fn llm_call_completion<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: String,
    llm_provider: Option<Provider>,
    query: LlmQuery<LlmQueryCompletion>,
    completion_options: Option<LlmCompletionOptions>
) -> Result<(), String> {
    let mut manager = context.providers_manager.lock().await;
    manager.llm_call_completion::<R>(app, &model, llm_provider, query, completion_options).await
}

#[tauri::command]
pub async fn llm_cancel_completion<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    llm_provider: Option<Provider>,
    conversation_id: String,
    message_id: String
) -> Result<(), String> {
    let mut manager = context.providers_manager.lock().await;
    manager.llm_cancel_completion::<R>(app, llm_provider, &conversation_id, &message_id).await
}

#[tauri::command]
pub async fn llm_call_tokenize<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: String,
    provider: Provider,
    text: String
) -> Result<LlmTokenizeResponse, String> {
    let mut manager = context.providers_manager.lock().await;
    manager.llm_call_tokenize::<R>(app, model, provider, text).await
}

#[tauri::command]
pub async fn llm_call_image_generation<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Option<String>,
    provider: Provider,
    prompt: String
) -> Result<LlmImageGenerationResponse, String> {
    let mut manager = context.providers_manager.lock().await;
    let response = manager.llm_call_image_generation::<R>(model, provider, prompt).await?;
    let images = response.images;
    let mut store = context.store.lock().await;
    println!("images url {:?}", images);
    let mut project = store.workspaces.get_selected_project()?;
    let project_path = project.path.clone();
    let path = store.workspaces.get_project_directory(Some(project_path))?.clone();
    let files = project.save_images(images, path).await?;
    Ok(LlmImageGenerationResponse {
        images: files,
    })
}

#[tauri::command]
pub async fn llm_call_models<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    provider: Provider,
) -> Result<LlmModelsResponse, String> {
    let mut manager = context.providers_manager.lock().await;
    manager.llm_call_models::<R>(provider).await
}