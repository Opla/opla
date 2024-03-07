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

use serde::{ Deserialize, Serialize };
use crate::error::Error;
use tauri::Runtime;
use eventsource_stream::Eventsource;
use futures_util::stream::StreamExt;

use crate::llm::{
    LlmQuery,
    LlmQueryCompletion,
    LlmCompletionResponse,
    LlmResponseError,
    LlmUsage,
    LlmError,
    LlmMessage,
};

use super::LlmCompletionOptions;

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIBodyCompletion {
    pub model: String,
    pub messages: Vec<LlmMessage>,
    pub stream: Option<bool>,
    pub temperature: Option<f32>,
    pub frequency_penalty: Option<f32>,
    pub presence_penalty: Option<f32>,
    pub seed: Option<f32>,
    pub stop: Option<Vec<String>>,
    pub top_p: Option<f32>,
    pub max_tokens: Option<f32>,
}

impl OpenAIBodyCompletion {
    pub fn new(
        model: String,
        from: &LlmQueryCompletion,
        options: Option<LlmCompletionOptions>
    ) -> Self {
        let mut messages: Vec<LlmMessage> = vec![];

        match options {
            Some(options) => {
                match options.system {
                    Some(system) => {
                        messages.push(LlmMessage {
                            content: system.clone(),
                            role: "system".to_owned(),
                            name: None,
                        });
                    }
                    None => {}
                }
            }
            None => {}
        }
        messages.extend(from.messages.clone());
        // TODO: handle context_window_policy and keep_system
        Self {
            model,
            messages,
            stream: from.get_parameter_as_boolean("stream"),
            temperature: from.get_parameter_as_f32("temperature"),
            stop: from.get_parameter_array("stop"),
            frequency_penalty: from.get_parameter_as_f32("frequency_penalty"),
            presence_penalty: from.get_parameter_as_f32("presence_penalty"),
            seed: from.get_parameter_as_f32("seed"),
            top_p: from.get_parameter_as_f32("top_p"),
            max_tokens: from.get_parameter_as_f32("max_tokens"),
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
            },
            // TODO implement usage
            // see : https://community.openai.com/t/why-there-is-no-usage-object-returned-with-streaming-api-call/385160/15
        }
    }

    fn to_llm_response(&self) -> LlmCompletionResponse {
        let mut response = LlmCompletionResponse::new(
            self.created,
            "success",
            &self.choices[0].message.content
        );
        let usage = LlmUsage {
            completion_tokens: Some(self.usage.completion_tokens),
            prompt_tokens: Some(self.usage.prompt_tokens),
            total_tokens: Some(self.usage.total_tokens),
            completion_ms: None,
            prompt_ms: None,
            total_ms: None,
            prompt_per_second: None,
            completion_per_second: None,
            total_per_second: None,
        };
        response.usage = Some(usage);
        response
    }
}

async fn request<R: Runtime>(
    url: String,
    secret_key: &str,
    parameters: OpenAIBodyCompletion
) -> Result<LlmCompletionResponse, Box<dyn std::error::Error>> {
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
    parameters: OpenAIBodyCompletion,
    callback: Option<impl FnMut(Result<LlmCompletionResponse, LlmError>) + Copy>
) -> Result<LlmCompletionResponse, Box<dyn std::error::Error>> {
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
                                    LlmCompletionResponse::new(
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
                                LlmCompletionResponse::new(
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
    completion_options: Option<LlmCompletionOptions>,
    callback: Option<impl FnMut(Result<LlmCompletionResponse, LlmError>) + Copy>
) -> Result<LlmCompletionResponse, Box<dyn std::error::Error>> {
    let start_time = chrono::Utc::now().timestamp_millis();
    let url = format!("{}/chat/{}s", api, query.command);
    println!(
        "{}",
        format!("llm call:  {:?} / {:?} / {:?} / {:?}", query.command, url, &model, query.options)
    );

    let parameters = OpenAIBodyCompletion::new(
        model.to_owned(),
        &query.options,
        completion_options
    );
    println!("llm call parameters:  {:?}", parameters);
    let stream = match parameters.stream {
        Some(t) => t,
        None => false,
    };
    let mut result;
    if stream {
        println!("llm call stream:  {:?}", stream);
        result = stream_request::<R>(url, secret_key, parameters, callback).await?;
    } else {
        result = request::<R>(url, secret_key, parameters).await?;
    }
    let end_time = chrono::Utc::now().timestamp_millis() - start_time;
    let mut usage = result.usage.unwrap_or(LlmUsage::new());
    usage.total_ms = Some(end_time);
    let total_tokens = usage.total_tokens.unwrap_or(0);
    if total_tokens > 0 && end_time > 0 {
        usage.total_per_second = Some(((total_tokens as f32) / (end_time as f32)) * 1000.0);
    }
    println!("llm call duration:  {:?} usage={:?}", end_time, usage);
    result.usage = Some(usage);
    Ok(result)
}
