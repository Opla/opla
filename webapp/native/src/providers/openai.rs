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

use chrono::DateTime;
use serde::{ Deserialize, Serialize };
use tauri::Runtime;
use eventsource_stream::Eventsource;
use futures_util::stream::StreamExt;

use tokenizer::encode;

use crate::{
    data::model::{Logo, Model},
    providers::llm::{
        LlmCompletionOptions,
        LlmCompletionResponse,
        LlmError,
        LlmMessage,
        LlmQuery,
        LlmQueryCompletion,
        LlmResponseError,
        LlmUsage,
    },
};

use super::llm::{ LlmImageGenerationResponse, LlmModelsResponse };

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
            "finished",
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

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIBodyImageGeneration {
    pub prompt: String,
    pub model: Option<String>,
    pub n: Option<u8>,
    pub quality: Option<String>,
    pub response_format: Option<String>,
    pub size: Option<String>,
    pub style: Option<String>,
}

impl OpenAIBodyImageGeneration {
    pub fn new(prompt: String, model: Option<String>) -> Self {
        OpenAIBodyImageGeneration {
            prompt: prompt.clone(),
            model: model.clone(),
            n: None,
            quality: None,
            response_format: None,
            size: None,
            style: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIImage {
    pub revisited_prompt: Option<String>,
    pub url: String,
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIImageGenerationResponse {
    pub created: i64,
    pub data: Vec<OpenAIImage>,
}
impl OpenAIImageGenerationResponse {
    pub fn to_llm_response(&mut self) -> LlmImageGenerationResponse {
        return LlmImageGenerationResponse {
            images: self.data
                .iter()
                .map(|d| format!("{}", d.url))
                .collect(),
        };
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIObjectResponse {
    pub object: String,
    pub id: String,
    pub created: i64,
    pub owned_by: String,
}
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenAIListResponse {
    pub object: String,
    pub data: Vec<OpenAIObjectResponse>,
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
            return Err(Box::new(error));
        }
    };
    let status = response.status();
    if !status.is_success() {
        let error = match response.json::<LlmResponseError>().await {
            Ok(t) => t,
            Err(error) => {
                println!("Failed to dezerialize error response: {}", error);
                return Err(Box::new(error));
            }
        };
        println!("Failed to get response: {} {:?}", status, error);
        return Err(Box::new(error.error));
    }
    let response = match response.json::<OpenAIChatCompletion>().await {
        Ok(r) => r,
        Err(error) => {
            println!("Failed to dezerialize response: {}", error);
            return Err(Box::new(error));
        }
    };

    Ok(response.to_llm_response())
}

async fn request_image(
    url: String,
    secret_key: &str,
    parameters: OpenAIBodyImageGeneration
) -> Result<LlmImageGenerationResponse, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let result = client.post(url).bearer_auth(&secret_key).json(&parameters).send().await;
    let response = match result {
        Ok(res) => res,
        Err(error) => {
            println!("Failed to send: {}", error);
            return Err(Box::new(error));
        }
    };
    let status = response.status();
    if !status.is_success() {
        let error = match response.json::<LlmResponseError>().await {
            Ok(t) => t,
            Err(error) => {
                println!("Failed to dezerialize error response: {}", error);
                return Err(Box::new(error));
            }
        };
        println!("Failed to get response: {} {:?}", status, error);
        return Err(Box::new(error.error));
    }
    let mut response = match response.json::<OpenAIImageGenerationResponse>().await {
        Ok(r) => r,
        Err(error) => {
            println!("Failed to dezerialize response: {}", error);
            return Err(Box::new(error));
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
                let message = format!("Failed to deserialize error response: {}", error);
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
                        return Err(Box::new(error));
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
                        cb(Err(LlmError::new(&message, "StreamError")));
                    }
                    None => (),
                }
                return Err(Box::new(error));
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

pub async fn call_image_generation(
    api: &str,
    secret_key: &str,
    prompt: &str,
    model: Option<String>
) -> Result<LlmImageGenerationResponse, Box<dyn std::error::Error>> {
    let url = format!("{}/images/generations", api);
    println!("{}", format!("image generation call:  {:?} / {:?}", url, &model));

    let parameters = OpenAIBodyImageGeneration::new(prompt.to_owned(), model.to_owned());
    println!("image generation call parameters:  {:?}", parameters);

    let result = request_image(url, secret_key, parameters).await?;
    Ok(result)
}

pub async fn call_models(
    api: &str,
    secret_key: &str
) -> Result<LlmModelsResponse, Box<dyn std::error::Error>> {
    let url = format!("{}/models", api);
    println!("{}", format!("models call:  {:?}", url));

    let client = reqwest::Client::new();
    let result = client.get(url).bearer_auth(&secret_key).send().await;
    let response = match result {
        Ok(res) => res,
        Err(error) => {
            println!("Failed to send: {}", error);
            return Err(Box::new(error));
        }
    };
    let status = response.status();
    if !status.is_success() {
        let error = match response.json::<LlmResponseError>().await {
            Ok(t) => t,
            Err(error) => {
                println!("Failed to dezerialize error response: {}", error);
                return Err(Box::new(error));
            }
        };
        println!("Failed to get response: {} {:?}", status, error);
        return Err(Box::new(error.error));
    }
    let response = match response.json::<OpenAIListResponse>().await {
        Ok(r) => r,
        Err(error) => {
            println!("Failed to dezerialize response: {}", error);
            return Err(Box::new(error));
        }
    };

    let models = response.data
        .iter()
        .map(|obj| {
            // TODO retrieve name, context_window, featured, deprecated and icon
            let id = obj.id.to_string();
            let tokens: Vec<String> = id
                .split("-")
                .map(|t| {
                    let t: &mut str = &mut t.to_string();
                    if !t.is_empty() {
                        t[0..1].make_ascii_uppercase();
                    }
                    t.to_string()
                })
                .collect();
            let mut name = tokens.join(" ");
            name = name.replace("Gpt ", "GPT-");
            name = name.replace("Dall ", "DALL-");
            name = name.replace("Tts ", "TTS-");

            let mut description = String::new();
            let mut context_window = 0;
            let mut deprecated = false;
            let mut featured = false;
            let mut icon_url = String::new();
            if id.contains("gpt-3.5") && id.contains("instruct") {
                context_window = 4096;
                deprecated = true;
                icon_url = "https://opla.github.io/models/assets/gpt-35.webp".to_string();
                description = "Similar capabilities as GPT-3 era models. Compatible with legacy Completions endpoint and not Chat Completions.".to_string();
            } else if id.contains("gpt-3.5-turbo") {
                context_window = 16385;
                featured = true;
                icon_url = "https://opla.github.io/models/assets/gpt-35.webp".to_string();
                description = "GPT-3.5 Turbo models can understand and generate natural language or code and have been optimized for chat using the Chat Completions API but work well for non-chat tasks as well.".to_string();
            } else if id.contains("gpt-3.5") {
                context_window = 4096;
                icon_url = "https://opla.github.io/models/assets/gpt-35.webp".to_string();
                deprecated = true;
            } else if id.contains("gpt-4o") {
                context_window = 128000;
                featured = true;
                icon_url = "https://opla.github.io/models/assets/gpt-4.webp".to_string();
                description = "GPT-4o (“o” for “omni”) is our most advanced model. It is multimodal (accepting text or image inputs and outputting text), and it has the same high intelligence as GPT-4 Turbo but is much more efficient—it generates text 2x faster and is 50% cheaper. Additionally, GPT-4o has the best vision and performance across non-English languages of any of our models.".to_string();
            } else if id.contains("gpt-4-turbo") || id.contains("preview") {
                context_window = 128000;
                featured = true;
                icon_url = "https://opla.github.io/models/assets/gpt-4.webp".to_string();
                description = "GPT-4 Turbo with Vision. GPT-4 is a large multimodal model (accepting text or image inputs and outputting text) that can solve difficult problems with greater accuracy than any of our previous models, thanks to its broader general knowledge and advanced reasoning capabilities.".to_string();
            } else if id.contains("gpt-4-32k") {
                context_window = 32768;
                icon_url = "https://opla.github.io/models/assets/gpt-4.webp".to_string();
                description = "This model was never rolled out widely in favor of GPT-4 Turbo.".to_string();
            } else if id.contains("gpt-4") {
                context_window = 8192;
                icon_url = "https://opla.github.io/models/assets/gpt-4.webp".to_string();
                description = "GPT-4 is a large multimodal model (accepting text or image inputs and outputting text) that can solve difficult problems with greater accuracy than any of our previous models, thanks to its broader general knowledge and advanced reasoning capabilities.".to_string();
            } else if id.contains("dall-e") {
                context_window = 0;
                description = "DALL·E is a AI system that can create realistic images and art from a description in natural language. DALL·E 3 currently supports the ability, given a prompt, to create a new image with a specific size. DALL·E 2 also support the ability to edit an existing image, or create variations of a user provided image.".to_string();
            } else if id.contains("tts") {
                context_window = 0;
                description = "TTS is an AI model that converts text to natural sounding spoken text.".to_string();
            } else if id.contains("whisper") {
                context_window = 0;
                description = "Whisper is a general-purpose speech recognition model. It is trained on a large dataset of diverse audio and is also a multi-task model that can perform multilingual speech recognition as well as speech translation and language identification.".to_string();
            }

            let mut model = Model::new(name);
            model.id = Some(obj.id.to_string());
            model.created_at = DateTime::from_timestamp(obj.created, 0);
            model.updated_at = DateTime::from_timestamp(obj.created, 0);
            model.creator = Some("openai".to_string());
            if context_window != 0 {
                model.context_window = Some(context_window);
            }
            if description.len() > 0 {
                model.description = Some(description);
            }
            if icon_url.len() > 0 {
                model.icon = Some(Logo {
                    url: icon_url,
                    name: None,
                    color: None,
                });
            }
            if deprecated {
                model.deprecated = Some(deprecated);
            }
            if featured {
                model.featured = Some(featured);
            }
            model
        })
        .collect();

    Ok(LlmModelsResponse {
        models,
    })
}

fn encode_length(text: String) -> usize {
    match encode(text, "gpt".to_owned(), None) {
        Ok(ranks) => ranks.len(),
        Err(_) => 0,
    }
}

// See:
// https://platform.openai.com/docs/guides/text-generation/managing-tokens
// https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken
pub fn num_tokens_from_messages(messages: &Vec<LlmMessage>) -> usize {
    let mut num_tokens = 0;
    for message in messages {
        num_tokens += 4; // every message follows <im_start>{role/name}\n{content}<im_end>\n
        num_tokens += encode_length(message.content.clone());
        num_tokens += 1; // message.role
        match &message.name {
            Some(name) => {
                num_tokens += encode_length(name.to_string()) - 1;
            }
            None => {}
        }
        num_tokens += 2; // # every reply is primed with <im_start>assistant
    }
    num_tokens
}
