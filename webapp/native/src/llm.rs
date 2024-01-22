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

use std::fmt;

use serde::{ Deserialize, Serialize };
use crate::error::Error;
use tauri::Runtime;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmError {
    pub message: String,
    pub r#type: String,
}

impl LlmError {
    pub fn new(msg: &str, r#type: &str) -> LlmError {
        LlmError { message: msg.to_string(), r#type: r#type.to_string() }
    }
}

impl fmt::Display for LlmError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}: {}", self.r#type, self.message)
    }
}

impl std::error::Error for LlmError {
    fn description(&self) -> &str {
        &self.message
    }
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmMessage {
    pub content: String,
    pub role: String,
    pub name: Option<String>,
}
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmQueryCompletion {
    pub messages: Vec<LlmMessage>,
    pub temperature: Option<f32>,
    pub n_predict: Option<i32>,
    pub stop: Option<Vec<String>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmQuery<T> {
    pub command: String,
    pub parameters: T,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmResponse {
    pub content: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmResponseError {
    pub error: LlmError,
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIQueryCompletion {
    pub model: String,
    pub messages: Vec<LlmMessage>,
    pub temperature: Option<f32>,
    pub stop: Option<Vec<String>>,
}

impl OpenAIQueryCompletion {
    pub fn new(model: String, from: LlmQueryCompletion) -> Self {
        Self {
            model,
            messages: from.messages,
            temperature: from.temperature,
            stop: from.stop,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIChatResponseChoice {
    pub message: LlmMessage,
    pub index: i32,
    pub finish_reason: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIChatResponseUsage {
    pub completion_tokens: i32,
    pub prompt_tokens: i32,
    pub total_tokens: i32,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIChatResponse {
    pub id: String,
    pub choices: Vec<OpenAIChatResponseChoice>,
    pub object: String,
    pub created: i64,
    pub system_fingerprint: Option<String>,
    pub usage: OpenAIChatResponseUsage,
}

impl OpenAIChatResponse {
    fn to_llm_response(&self) -> LlmResponse {
        LlmResponse {
            content: self.choices[0].message.content.clone(),
        }
    }
}
pub async fn call_completion<R: Runtime>(
    api: &str,
    secret_key: &str,
    model: &str,
    query: LlmQuery<LlmQueryCompletion>
) -> Result<LlmResponse, Box<dyn std::error::Error>> {
    let url = format!("{}/chat/{}s", api, query.command);
    println!(
        "{}",
        format!(
            "llm call:  {:?} / {:?} / {:?} / {:?}",
            query.command,
            url,
            &model,
            query.parameters
        )
    );

    let parameters = OpenAIQueryCompletion::new(model.to_owned(), query.parameters);
    println!("llm call parameters:  {:?}", parameters);
    let client = reqwest::Client::new();
    let result = client.post(url).bearer_auth(&secret_key).json(&parameters).send().await;
    let response = match result {
        Ok(res) => res,
        Err(error) => {
            println!("Failed to send: {}", error);
            return Err(Box::new(Error::BadJson));
        }
    };
    let status = response.status();
    if !status.is_success() {
        let error = match response.json::<LlmResponseError>().await {
            Ok(t) => t,
            Err(error) => {
                println!("Failed to dezerialize error response: {}", error);
                return Err(Box::new(Error::BadJson));
            }
        };
        println!("Failed to get response: {} {:?}", status, error);
        return Err(Box::new(error.error));
    }
    let response = match response.json::<OpenAIChatResponse>().await {
        Ok(r) => r,
        Err(error) => {
            println!("Failed to dezerialize response: {}", error);
            return Err(Box::new(Error::BadJson));
        }
    };

    Ok(response.to_llm_response())
}
