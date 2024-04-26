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


use crate::{
    providers::llm::LlmQueryCompletion,
    store::ServerParameters,
    utils::http_client::{ self, HttpError, HttpResponse },
};

use async_trait::async_trait;
use serde::{ Deserialize, Serialize };
use tokio::sync::mpsc::Sender;
use crate::providers::llm::{ LlmQuery, LlmCompletionResponse, LlmUsage };

use super::llm::{ LlmCompletionOptions, LlmError, LlmInferenceClient, LlmTokenizeResponse };

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
            message_id: None,
            usage: Some(self.timings.to_llm_usage()),
            message: None,
        }
    }
}

impl HttpError for LlamaCppChatCompletion {
    fn to_error(&self, status: String) -> Box<dyn std::error::Error> {
        let error = LlmError {
            message: format!("HTTP error {} : {}", status, self.content.to_string()),
            status: "http_error".to_string(),
        };
        Box::new(error)
    }
    fn to_error_string(&self, status: String) -> String {
        format!("HTTP error {} : {}", status, self.content.to_string())
    }
}

impl HttpResponse<LlmCompletionResponse> for LlamaCppChatCompletion {
    fn convert_into(&self) -> LlmCompletionResponse {
        LlmCompletionResponse {
            created: None,
            status: Some("finished".to_owned()),
            content: self.content.clone(),
            conversation_id: None,
            message_id: None,
            usage: Some(self.timings.to_llm_usage()),
            message: None,
        }
    }

    fn new(content: String, _end_time: u64) -> Self {
        LlamaCppChatCompletion {
            content,
            timings: LlamaCppChatTimings {
                predicted_ms: 0.0,
                predicted_n: 0,
                predicted_per_second: 0.0,
                predicted_per_token_ms: 0.0,
                prompt_ms: 0.0,
                prompt_n: 0,
                prompt_per_second: 0.0,
                prompt_per_token_ms: 0.0,
            },
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
pub struct LlamaCppInferenceClient {
    pub server_parameters: Option<ServerParameters>,
}

impl LlamaCppInferenceClient {
    pub fn new(parameters: Option<ServerParameters>) -> Self {
        LlamaCppInferenceClient {
            server_parameters: parameters.clone(),
        }
    }

    pub fn create(&mut self, server_parameters: &Option<ServerParameters>) -> Self {
        let mut instance = self.clone();
        instance.server_parameters = server_parameters.clone();
        instance
    }

    fn get_api(&self, endpoint: String) -> Result<String, String> {
        // TODO https support
        let (host, port) = match &self.server_parameters {
            Some(parameters) => (parameters.host.clone(), parameters.port),
            None => {
                println!("LlamaCpp inference client server error try to read parameters");
                return Err(String::from("LlamaCpp inference client error try to read parameters"));
            }
        };
        Ok(format!("http://{:}:{:}/{}", host, port, endpoint))
    }

    fn build_stream_chunk(data: String, _created: i64) -> Result<Option<String>, LlmError> {
        let chunk = match serde_json::from_str::<LlamaCppChatCompletionChunk>(&data) {
            Ok(r) => r,
            Err(error) => {
                let message = format!("Failed to parse response: {}", error);
                println!("{}", message);
                return Err(LlmError::new(&message, "FailedParsingResponse")); // Err(Box::new(error));
            }
        };
        println!("chunk: {:?}", chunk);
        if chunk.stop.unwrap_or(false) {
            println!("chunk: stop");
            return Ok(None);
        } else {
            return Ok(Some(chunk.content.to_string()));
        }
    }
}

#[async_trait]
impl LlmInferenceClient for LlamaCppInferenceClient {
    fn set_parameters(&mut self, parameters: ServerParameters) {
        self.server_parameters = Some(parameters);
    }

    async fn call_completion(
        &mut self,
        query: &LlmQuery<LlmQueryCompletion>,
        completion_options: Option<LlmCompletionOptions>,
        sender: Sender<Result<LlmCompletionResponse, LlmError>>,
    ) {
        let parameters = query.options.to_llama_cpp_parameters(completion_options);

        let is_stream = parameters.stream.unwrap_or(false);

        let api_url = match self.get_api(query.command.clone()) {
            Ok(url) => url,
            Err(msg) => {
                let _ = sender.send(Err(LlmError::new(&msg, "Parameters_error"))).await;
                return;
            }
        };

        http_client::HttpClient::post_request::<
            LlamaCppQueryCompletion,
            LlamaCppChatCompletion,
            LlmCompletionResponse,
            LlmError
        >(
            api_url,
            parameters,
            None,
            is_stream,
            &mut LlamaCppInferenceClient::build_stream_chunk,
            sender,
        ).await;
    }

    async fn call_tokenize(
        &mut self,
        model: &str,
        text: String
    ) -> Result<LlmTokenizeResponse, Box<dyn std::error::Error>> {
        // TODO handle model
        let parameters = LlamaCppQueryTokenize {
            content: text,
        };
        let api_url = match self.get_api(String::from("tokenize")) {
            Ok(url) => url,
            Err(msg) => {
                return Err(Box::new(LlmError::new(&msg, "Parameters_error")));
            }
        };
        let client = reqwest::Client::new();
        let res = client.post(api_url).json(&parameters).send().await;
        let response = match res {
            Ok(res) => res,
            Err(error) => {
                println!("Failed to get Response: {}", error);
                return Err(Box::new(error));
            }
        };
        let status = response.status();
        println!("Response Status: {} {}", status, model);
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
