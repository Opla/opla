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

use crate::{ error::Error, llm::LlmQueryCompletion, store::ServerParameters };

use tauri::Runtime;
use serde::{ Deserialize, Serialize };
use crate::llm::{ LlmQuery, LlmResponse, LlmUsage };

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
    fn to_llama_cpp_parameters(&self) -> LlamaCppQueryCompletion {
        let mut prompt = String::new();
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
    pub fn to_llm_response(&self) -> LlmResponse {
        LlmResponse {
            created: None,
            status: None,
            content: self.content.clone(),
            conversation_id: None,
            usage: Some(self.timings.to_llm_usage()),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LLamaCppServer {}

impl LLamaCppServer {
    pub fn new() -> Self {
        LLamaCppServer {}
    }

    pub async fn call_completion<R: Runtime>(
        &mut self,
        query: LlmQuery<LlmQueryCompletion>,
        server_parameters: &ServerParameters
    ) -> Result<LlmResponse, Box<dyn std::error::Error>> {
        let parameters = query.options.to_llama_cpp_parameters();

        // TODO https support
        let api = format!("http://{:}:{:}", server_parameters.host, server_parameters.port);
        let client = reqwest::Client::new();
        let res = client
            .post(format!("{}/{}", api, query.command)) // TODO remove hardcoding
            .json(&parameters)
            .send().await;
        let response = match res {
            Ok(res) => res,
            Err(error) => {
                println!("Failed to get Response: {}", error);
                return Err(Box::new(Error::BadResponse));
            }
        };
        let status = response.status();
        println!("Response Status: {}", status);
        let response = match response.json::<LlamaCppChatCompletion>().await {
            Ok(r) => r,
            Err(error) => {
                println!("Failed to parse response: {}", error);
                return Err(Box::new(Error::BadResponse));
            }
        };
        Ok(response.to_llm_response())
    }
}
