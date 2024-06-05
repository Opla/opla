use bytes::Bytes;
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
use dyn_clone::DynClone;
use std::fmt;
use async_trait::async_trait;
use serde::{ Deserialize, Serialize };

use crate::{
    data::model::Model,
    utils::http_client::{ HttpChunk, HttpError, NewHttpError },
};

use super::{ services::HttpService, ProviderAdapter, ServerParameters };

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmError {
    pub message: String,
    pub status: String,
}

impl LlmError {
    pub fn new(msg: &str, status: &str) -> LlmError {
        LlmError { message: msg.to_string(), status: status.to_string() }
    }

    pub fn to_string(&self) -> String {
        return format!("{}: {}", self.status, self.message);
    }
}

impl NewHttpError for LlmError {
    fn new(msg: &str, status: &str) -> Self {
        LlmError { message: msg.to_string(), status: status.to_string() }
    }
}

impl fmt::Display for LlmError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}: {}", self.status, self.message)
    }
}

impl std::error::Error for LlmError {
    fn description(&self) -> &str {
        &self.message
    }
}

impl HttpError for LlmError {
    fn to_error(&self, status: String) -> Box<dyn std::error::Error> {
        let error = LlmError {
            message: format!("HTTP error {} : {}", status, self.message.to_string()),
            status: "http_error".to_string(),
        };
        Box::new(error)
    }
    fn to_error_string(&self, status: String) -> String {
        format!("HTTP error {} : {}", status, self.message.to_string())
    }
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmMessage {
    pub content: String,
    pub role: String,
    pub name: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmParameter {
    pub key: String,
    pub value: String,
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmQueryCompletion {
    pub conversation_id: Option<String>,
    pub message_id: Option<String>,
    pub messages: Vec<LlmMessage>,
    pub prompt: Option<String>,
    pub parameters: Option<Vec<LlmParameter>>,
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmCompletionOptions {
    pub context_window_policy: Option<String>,
    pub keep_system: Option<bool>,
    pub system: Option<String>,
}

impl LlmQueryCompletion {
    pub fn get_parameter_value(&self, key: &str) -> Option<String> {
        let parameters = match &self.parameters {
            Some(p) => p,
            None => {
                return None;
            }
        };
        parameters
            .iter()
            .find(|p| p.key == key)
            .map(|p| Some(p.value.clone()))
            .unwrap_or(None)
    }

    pub fn get_parameter_as_boolean(&self, key: &str) -> Option<bool> {
        let value = match self.get_parameter_value(key) {
            Some(v) => v,
            None => {
                return None;
            }
        };
        match value.as_str() {
            "true" => Some(true),
            "false" => Some(false),
            _ => None,
        }
    }

    pub fn get_parameter_as_f32(&self, key: &str) -> Option<f32> {
        let value = match self.get_parameter_value(key) {
            Some(v) => v,
            None => {
                return None;
            }
        };
        match value.parse::<f32>() {
            Ok(v) => Some(v),
            Err(_) => None,
        }
    }

    pub fn get_parameter_array(&self, key: &str) -> Option<Vec<String>> {
        let value = match self.get_parameter_value(key) {
            Some(v) => v,
            None => {
                return None;
            }
        };
        let mut array: Vec<String> = vec![];
        for item in value.split(",") {
            array.push(item.to_owned());
        }
        Some(array)
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmQuery<T> {
    pub command: String,
    pub options: T,
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmUsage {
    // Tokens
    pub completion_tokens: Option<i32>,
    pub prompt_tokens: Option<i32>,
    pub total_tokens: Option<i32>,

    // Timing
    pub completion_ms: Option<i64>,
    pub prompt_ms: Option<i64>,
    pub total_ms: Option<i64>,
    pub prompt_per_second: Option<f32>,
    pub completion_per_second: Option<f32>,
    pub total_per_second: Option<f32>,
}
impl LlmUsage {
    pub fn new() -> Self {
        Self {
            completion_tokens: None,
            prompt_tokens: None,
            total_tokens: None,
            completion_ms: None,
            prompt_ms: None,
            total_ms: None,
            prompt_per_second: None,
            completion_per_second: None,
            total_per_second: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmResponse {}

pub trait LlmResponseImpl {
    fn new(created: i64, status: &str, content: &str) -> Self;
    fn completion_to(response: LlmCompletionResponse) -> Self;
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmCompletionResponse {
    pub created: Option<i64>,
    pub status: Option<String>,
    pub content: String,
    pub conversation_id: Option<String>,
    pub message_id: Option<String>,
    pub usage: Option<LlmUsage>,
    pub message: Option<String>,
}
impl HttpChunk for LlmCompletionResponse {
    fn new(created: i64, status: &str, content: &str) -> Self {
        Self {
            created: Some(created),
            status: Some(status.to_owned()),
            content: content.to_owned(),
            conversation_id: None,
            message_id: None,
            usage: None,
            message: None,
        }
    }
}

impl LlmCompletionResponse {
    pub fn new(created: i64, status: &str, content: &str) -> Self {
        Self {
            created: Some(created),
            status: Some(status.to_owned()),
            content: content.to_owned(),
            conversation_id: None,
            message_id: None,
            usage: None,
            message: None,
        }
    }
}

impl LlmResponseImpl for LlmCompletionResponse {
    fn new(created: i64, status: &str, content: &str) -> Self {
        Self {
            created: Some(created),
            status: Some(status.to_owned()),
            content: content.to_owned(),
            conversation_id: None,
            message_id: None,
            usage: None,
            message: None,
        }
    }

    fn completion_to(response: LlmCompletionResponse) -> Self {
        response
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmResponseError {
    pub error: LlmError,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmTokenizeResponse {
    pub tokens: Vec<u64>,
}

#[async_trait]
pub trait LlmInferenceInterface: DynClone {
    fn set_parameters(&mut self, parameters: ServerParameters);

    fn deserialize_response(&mut self, full: &Bytes) -> Result<LlmCompletionResponse, LlmError>;

    fn deserialize_response_error(&mut self, full: &Bytes) -> Result<LlmResponseError, LlmError>;
    fn build_stream_chunk(
        &mut self,
        data: String,
        _created: i64
    ) -> Result<Option<String>, LlmError>;

    async fn call_completion(
        &mut self,
        query: &LlmQuery<LlmQueryCompletion>,
        completion_options: Option<LlmCompletionOptions>,
        adapter: &mut ProviderAdapter
    ) -> Result<HttpService<LlmCompletionResponse, LlmError>, LlmError>;

    async fn call_tokenize(
        &mut self,
        model: &str,
        text: String
    ) -> Result<LlmTokenizeResponse, Box<dyn std::error::Error>>;
}

dyn_clone::clone_trait_object!(LlmInferenceInterface);

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmImageGenerationResponse {
    pub images: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmModelsResponse {
    pub models: Vec<Model>,
}
