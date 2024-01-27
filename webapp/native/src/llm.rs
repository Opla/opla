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
use eventsource_stream::Eventsource;
use futures_util::stream::StreamExt;

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
    pub conversation_id: Option<String>,
    pub messages: Vec<LlmMessage>,
    pub temperature: Option<f32>,
    pub n_predict: Option<i32>,
    pub stop: Option<Vec<String>>,
    pub stream: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmQuery<T> {
    pub command: String,
    pub parameters: T,
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmResponse {
    pub created: i64,
    pub status: String,
    pub content: String,
    pub conversation_id: Option<String>,
}
impl LlmResponse {
    pub fn new(created: i64, status: &str, content: &str) -> Self {
        Self {
            created,
            status: status.to_owned(),
            content: content.to_owned(),
            conversation_id: None,
        }
    }
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
    pub stream: Option<bool>,
}

impl OpenAIQueryCompletion {
    pub fn new(model: String, from: LlmQueryCompletion) -> Self {
        Self {
            model,
            messages: from.messages,
            temperature: from.temperature,
            stop: from.stop,
            stream: from.stream,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIChatChoice {
    pub message: LlmMessage,
    pub index: i32,
    pub finish_reason: String,
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmChunkMessage {
    pub content: Option<String>,
    pub role: Option<String>,
    pub name: Option<String>,
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIChatChunkChoice {
    pub delta: LlmChunkMessage,
    pub index: i32,
    pub finish_reason: Option<String>,
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
struct OpenAIChatCompletionChunk {
    pub id: String,
    pub choices: Vec<OpenAIChatChunkChoice>,
    pub model: String,
    pub created: i64,
    pub system_fingerprint: Option<String>,
    pub object: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIChatUsage {
    pub completion_tokens: i32,
    pub prompt_tokens: i32,
    pub total_tokens: i32,
}
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIChatCompletion {
    pub id: String,
    pub choices: Vec<OpenAIChatChoice>,
    pub object: String,
    pub created: i64,
    pub system_fingerprint: Option<String>,
    pub usage: OpenAIChatUsage,
}

impl OpenAIChatCompletion {
    fn from_chunks(chunks: Vec<OpenAIChatCompletionChunk>) -> Self {
        let mut choices: Vec<OpenAIChatChoice> = vec![];
        let id = chunks[0].id.clone();
        let object = chunks[0].object.clone();
        let created = chunks[0].created;
        let system_fingerprint = chunks[0].system_fingerprint.clone();
        let finish_reason = match &chunks[chunks.len() - 1].choices[0].finish_reason {
            Some(f) => f,
            None => "",
        };
        let role = match &chunks[chunks.len() - 1].choices[0].delta.role {
            Some(f) => f,
            None => "assistant",
        };
        let name = &chunks[chunks.len() - 1].choices[0].delta.name.clone();
        let mut content = String::new();
        for chunk in &chunks {
            // TODO: handle multiple choices index
            match &chunk.choices[0].delta.content {
                Some(c) => content.push_str(c),
                None => (),
            }
        }
        choices.push(OpenAIChatChoice {
            message: LlmMessage {
                content,
                role: role.to_owned(),
                name: name.clone(),
            },
            index: 0,
            finish_reason: finish_reason.to_owned(),
        });
        Self {
            id,
            choices,
            object,
            created,
            system_fingerprint,
            usage: OpenAIChatUsage {
                completion_tokens: 0,
                prompt_tokens: 0,
                total_tokens: 0,
            }, // TODO implement usage
        }
    }

    fn to_llm_response(&self) -> LlmResponse {
        LlmResponse::new(self.created, "success", &self.choices[0].message.content)
    }
}

async fn request<R: Runtime>(
    url: String,
    secret_key: &str,
    parameters: OpenAIQueryCompletion
) -> Result<LlmResponse, Box<dyn std::error::Error>> {
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
    let response = match response.json::<OpenAIChatCompletion>().await {
        Ok(r) => r,
        Err(error) => {
            println!("Failed to dezerialize response: {}", error);
            return Err(Box::new(Error::BadJson));
        }
    };

    Ok(response.to_llm_response())
}

async fn stream_request<R: Runtime>(
    url: String,
    secret_key: &str,
    parameters: OpenAIQueryCompletion,
    callback: Option<impl FnMut(Result<LlmResponse, LlmError>) + Copy>
) -> Result<LlmResponse, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let result = client.post(url).bearer_auth(&secret_key).json(&parameters).send().await;
    let response = match result {
        Ok(res) => res,
        Err(error) => {
            let message = format!("Failed to send: {}", error);
            println!("{}", message);
            match callback {
                Some(mut cb) => {
                    cb(Err(LlmError::new(&message, "BadJson")));
                }
                None => (),
            }
            return Err(Box::new(Error::BadJson));
        }
    };
    let status = response.status();
    if !status.is_success() {
        let error = match response.json::<LlmResponseError>().await {
            Ok(t) => t,
            Err(error) => {
                let message = format!("Failed to dezerialize error response: {}", error);
                println!("{}", message);
                match callback {
                    Some(mut cb) => {
                        cb(Err(LlmError::new(&message, "BadJson")));
                    }
                    None => (),
                }
                return Err(Box::new(Error::BadJson));
            }
        };
        let message = format!("Failed to get response: {} {:?}", status, error);
        println!("{}", message);
        match callback {
            Some(mut cb) => {
                cb(Err(LlmError::new(&message, "BadJson")));
            }
            None => (),
        }
        return Err(Box::new(error.error));
    }
    let mut stream = response.bytes_stream().eventsource();
    let mut chunks: Vec<OpenAIChatCompletionChunk> = vec![];
    while let Some(event) = stream.next().await {
        match event {
            Ok(event) => {
                // break the loop at the end of SSE stream
                if event.data == "[DONE]" {
                    match callback {
                        Some(mut cb) => {
                            cb(
                                Ok(
                                    LlmResponse::new(
                                        chrono::Utc::now().timestamp_millis(),
                                        "finished",
                                        "done"
                                    )
                                )
                            );
                        }
                        None => (),
                    }
                    break;
                }

                // parse the event data into a Completion object
                let chunk = match serde_json::from_str::<OpenAIChatCompletionChunk>(&event.data) {
                    Ok(t) => t,
                    Err(error) => {
                        println!("Failed to dezerialize event data: {}", error);
                        return Err(Box::new(Error::BadJson));
                    }
                };
                match callback {
                    Some(mut cb) => {
                        cb(
                            Ok(
                                LlmResponse::new(
                                    chunk.created,
                                    "success",
                                    chunk.choices[0].delta.content
                                        .as_ref()
                                        .unwrap_or(&String::from(""))
                                )
                            )
                        );
                    }
                    None => (),
                }
                chunks.push(chunk);
            }
            Err(error) => {
                let message = format!("Error in event stream: {}", error);
                println!("{}", message);
                match callback {
                    Some(mut cb) => {
                        cb(Err(LlmError::new(&message, "BadJson")));
                    }
                    None => (),
                }
                return Err(Box::new(Error::BadJson));
            }
        }
    }
    let completion = OpenAIChatCompletion::from_chunks(chunks);

    Ok(completion.to_llm_response())
}

pub async fn call_completion<R: Runtime>(
    api: &str,
    secret_key: &str,
    model: &str,
    query: LlmQuery<LlmQueryCompletion>,
    callback: Option<impl FnMut(Result<LlmResponse, LlmError>) + Copy>
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
    let stream = match parameters.stream {
        Some(t) => t,
        None => false,
    };
    if stream {
        println!("llm call stream:  {:?}", stream);
        stream_request::<R>(url, secret_key, parameters, callback).await
    } else {
        request::<R>(url, secret_key, parameters).await
    }
}
