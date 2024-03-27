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

use crate::{ llm::{ LlmQueryCompletion, LlmResponseError }, store::ServerParameters };

use tauri::Runtime;
use eventsource_stream::Eventsource;
use futures_util::stream::StreamExt;

use serde::{ Deserialize, Serialize };
use crate::llm::{ LlmQuery, LlmCompletionResponse, LlmUsage };

use super::{ LlmCompletionOptions, LlmError, LlmTokenizeResponse };

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlamaCppQueryCompletion {
    pub prompt: String,
    pub stream: Option<bool>,
    pub temperature: Option<f32>,
    pub frequency_penalty: Option<f32>,
    pub presence_penalty: Option<f32>,
    pub seed: Option<f32>,
    pub stop: Option<Vec<String>>,
    pub top_p: Option<f32>,
    pub top_k: Option<f32>,
    pub min_p: Option<f32>,
    pub n_predict: Option<f32>,
    pub n_keep: Option<f32>,
    pub tfs_z: Option<f32>,
    pub typical_p: Option<f32>,
    pub repeat_penalty: Option<f32>,
    pub repeat_last_n: Option<f32>,
    pub penalize_nl: Option<bool>,
    pub penalty_prompt: Option<Vec<String>>,
    pub mirostat: Option<f32>,
    pub mirostat_tau: Option<f32>,
    pub mirostat_eta: Option<f32>,
    pub grammar: Option<String>,
    pub ignore_eos: Option<bool>,
}

impl LlmQueryCompletion {
    fn to_llama_cpp_parameters(
        &self,
        options: Option<LlmCompletionOptions>
    ) -> LlamaCppQueryCompletion {
        let mut prompt = String::new();
        match options {
            Some(options) => {
                match options.system {
                    Some(system) => {
                        prompt.push_str(&format!("{}\n", system));
                    }
                    None => {}
                }
            }
            None => {}
        }
        // TODO: handle context_window_policy and keep_system
        for message in &self.messages {
            match message.role.as_str() {
                "user" => {
                    prompt.push_str("Question:");
                }
                "assistant" => {
                    prompt.push_str("Answer:");
                }
                _ => {}
            }
            prompt.push_str(&message.content.trim());
            prompt.push('\n');
        }
        prompt.push_str("Answer:");
        println!("prompt: {}", prompt);
        LlamaCppQueryCompletion {
            prompt,
            stream: self.get_parameter_as_boolean("stream"),
            temperature: self.get_parameter_as_f32("temperature"),
            stop: self.get_parameter_array("stop"),
            frequency_penalty: self.get_parameter_as_f32("frequency_penalty"),
            presence_penalty: self.get_parameter_as_f32("presence_penalty"),
            seed: self.get_parameter_as_f32("seed"),
            top_p: self.get_parameter_as_f32("top_p"),
            top_k: self.get_parameter_as_f32("top_k"),
            min_p: self.get_parameter_as_f32("min_p"),
            n_predict: self.get_parameter_as_f32("n_predict"),
            n_keep: self.get_parameter_as_f32("n_keep"),
            tfs_z: self.get_parameter_as_f32("tfs_z"),
            typical_p: self.get_parameter_as_f32("typical_p"),
            repeat_penalty: self.get_parameter_as_f32("repeat_penalty"),
            repeat_last_n: self.get_parameter_as_f32("repeat_last_n"),
            penalize_nl: self.get_parameter_as_boolean("penalize_nl"),
            penalty_prompt: self.get_parameter_array("penalty_prompt"),
            mirostat: self.get_parameter_as_f32("mirostat"),
            mirostat_tau: self.get_parameter_as_f32("mirostat_tau"),
            mirostat_eta: self.get_parameter_as_f32("mirostat_eta"),
            grammar: self.get_parameter_value("grammar"),
            ignore_eos: self.get_parameter_as_boolean("ignore_eos"),
        }
    }
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlamaCppChatTimings {
    pub predicted_ms: f32,
    pub predicted_n: i32,
    pub predicted_per_second: f32,
    pub predicted_per_token_ms: f32,
    pub prompt_ms: f32,
    pub prompt_n: i32,
    pub prompt_per_second: f32,
    pub prompt_per_token_ms: f32,
}
impl LlamaCppChatTimings {
    pub fn to_llm_usage(&self) -> LlmUsage {
        LlmUsage {
            completion_tokens: Some(self.predicted_n),
            prompt_tokens: Some(self.prompt_n),
            total_tokens: Some(self.predicted_n + self.prompt_n),
            completion_ms: Some(self.predicted_ms as i64),
            prompt_ms: Some(self.prompt_ms as i64),
            total_ms: Some((self.predicted_ms + self.prompt_ms) as i64),
            prompt_per_second: Some(self.prompt_per_second),
            completion_per_second: Some(self.predicted_per_second),
            total_per_second: Some(self.predicted_per_second + self.prompt_per_second),
        }
    }
}
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlamaCppChatCompletion {
    pub content: String,
    pub timings: LlamaCppChatTimings,
}

impl LlamaCppChatCompletion {
    pub fn to_llm_response(&self) -> LlmCompletionResponse {
        LlmCompletionResponse {
            created: None,
            status: Some("success".to_owned()),
            content: self.content.clone(),
            conversation_id: None,
            usage: Some(self.timings.to_llm_usage()),
            message: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlamaCppChatCompletionChunk {
    pub content: String,
    pub stop: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlamaCppQueryTokenize {
    pub content: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlamaCppTokenize {
    pub tokens: Vec<u64>,
}
impl LlamaCppTokenize {
    pub fn to_llm_response(&self) -> LlmTokenizeResponse {
        LlmTokenizeResponse {
            tokens: self.tokens.clone(),
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LLamaCppServer {}

impl LLamaCppServer {
    pub fn new() -> Self {
        LLamaCppServer {}
    }

    fn get_api(&self, server_parameters: &ServerParameters, endpoint: String) -> String {
        // TODO https support
        format!("http://{:}:{:}/{}", server_parameters.host, server_parameters.port, endpoint)
    }

    async fn post_request<R: Runtime>(
        &self,
        api_url: String,
        parameters: LlamaCppQueryCompletion
    ) -> Result<LlmCompletionResponse, Box<dyn std::error::Error>> {
        let client = reqwest::Client::new();
        let result = client
            .post(api_url) // TODO remove hardcoding
            .json(&parameters)
            .send().await;
        let response = match result {
            Ok(res) => res,
            Err(error) => {
                println!("Failed to get Response: {}", error);
                return Err(Box::new(error));
            }
        };
        let status = response.status();
        
        let response = match response.json::<LlamaCppChatCompletion>().await {
            Ok(r) => r,
            Err(error) => {
                println!("Failed to parse response: {}", error);
                return Err(Box::new(error));
            }
        };
        println!("Response Status: {} {:?}", status, response);
        Ok(response.to_llm_response())
    }

    async fn post_stream_request<R: Runtime>(
        &self,
        api_url: String,
        parameters: LlamaCppQueryCompletion,
        callback: Option<impl FnMut(Result<LlmCompletionResponse, LlmError>) + Copy>
    ) -> Result<LlmCompletionResponse, Box<dyn std::error::Error>> {
        let start_time = chrono::Utc::now().timestamp_millis();

        let client = reqwest::Client::new();
        let result = client
            .post(api_url) // TODO remove hardcoding
            .json(&parameters)
            .send().await;
        let response = match result {
            Ok(res) => res,
            Err(error) => {
                let message = format!("Failed to send: {}", error);
                println!("{}", message);
                match callback {
                    Some(mut cb) => {
                        cb(Err(LlmError::new(&message, "FailedSend")));
                    }
                    None => (),
                }
                return Err(Box::new(error));
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
                            cb(Err(LlmError::new(&message, "FailedDeserialize")));
                        }
                        None => (),
                    }
                    return Err(Box::new(error));
                }
            };
            let message = format!("Failed to get response: {} {:?}", status, error);
            println!("{}", message);
            match callback {
                Some(mut cb) => {
                    cb(Err(LlmError::new(&message, "FailedResponse")));
                }
                None => (),
            }
            return Err(Box::new(error.error));
        }
        let mut stream = response.bytes_stream().eventsource();
        let mut content = String::new();
        let created = chrono::Utc::now().timestamp_millis();
        while let Some(event) = stream.next().await {
            match event {
                Ok(event) => {
                    let data = event.data;
                    let chunk = match serde_json::from_str::<LlamaCppChatCompletionChunk>(&data) {
                        Ok(r) => r,
                        Err(error) => {
                            let message = format!("Failed to parse response: {}", error);
                            println!("{}", message);
                            match callback {
                                Some(mut cb) => {
                                    cb(Err(LlmError::new(&message, "FailedParsingResponse")));
                                }
                                None => (),
                            }
                            return Err(Box::new(error));
                        }
                    };
                    println!("chunk: {:?}", chunk);
                    if chunk.stop.unwrap_or(false) {
                        println!("chunk: stop");
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
                    } else {
                        content.push_str(chunk.content.as_str());
                        match callback {
                            Some(mut cb) => {
                                cb(
                                    Ok(
                                        LlmCompletionResponse::new(
                                            created,
                                            "success",
                                            chunk.content.as_str()
                                        )
                                    )
                                );
                            }
                            None => (),
                        }
                    }
                }
                Err(error) => {
                    let message = format!("Failed to get event: {}", error);
                    println!("{}", message);
                    match callback {
                        Some(mut cb) => {
                            cb(Err(LlmError::new(&message, "FailedEvent")));
                        }
                        None => (),
                    }
                    return Err(Box::new(error));
                }
            }
        }
        let end_time = chrono::Utc::now().timestamp_millis() - start_time;
        let mut usage = LlmUsage::new();
        usage.total_ms = Some(end_time);
        let total_tokens = usage.total_tokens.unwrap_or(0);
        if total_tokens > 0 && end_time > 0 {
            usage.total_per_second = Some(((total_tokens as f32) / (end_time as f32)) * 1000.0);
        }
        println!("Response Status: {} {}", status, content);
        Ok(LlmCompletionResponse {
            created: Some(created),
            status: Some("success".to_owned()),
            content,
            conversation_id: None,
            usage: Some(usage),
            message: None,
        })
    }

    pub async fn call_completion<R: Runtime>(
        &mut self,
        query: LlmQuery<LlmQueryCompletion>,
        server_parameters: &ServerParameters,
        completion_options: Option<LlmCompletionOptions>,
        callback: Option<impl FnMut(Result<LlmCompletionResponse, LlmError>) + Copy>
    ) -> Result<LlmCompletionResponse, Box<dyn std::error::Error>> {
        let parameters = query.options.to_llama_cpp_parameters(completion_options);

        let stream = parameters.stream.unwrap_or(false);

        let api_url = self.get_api(server_parameters, query.command);

        let result;
        if stream {
            result = self.post_stream_request::<R>(api_url, parameters, callback).await?;
        } else {
            result = self.post_request::<R>(api_url, parameters).await?;
        }
        Ok(result)
    }

    pub async fn call_tokenize<R: Runtime>(
        &mut self,
        text: String,
        server_parameters: &ServerParameters
    ) -> Result<LlmTokenizeResponse, Box<dyn std::error::Error>> {
        let parameters = LlamaCppQueryTokenize {
            content: text,
        };
        let api_url = self.get_api(server_parameters, "tokenize".to_owned());
        let client = reqwest::Client::new();
        let res = client
            .post(api_url)
            .json(&parameters)
            .send().await;
        let response = match res {
            Ok(res) => res,
            Err(error) => {
                println!("Failed to get Response: {}", error);
                return Err(Box::new(error));
            }
        };
        let status = response.status();
        println!("Response Status: {}", status);
        let response = match response.json::<LlamaCppTokenize>().await {
            Ok(r) => r,
            Err(error) => {
                println!("Failed to parse response: {}", error);
                return Err(Box::new(error));
            }
        };
        Ok(response.to_llm_response())
    }
}
