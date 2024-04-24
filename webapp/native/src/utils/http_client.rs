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

use tokio::sync::mpsc::Sender;
use reqwest::{ Client, RequestBuilder, Response };
use serde::{ Deserialize, Serialize };
use eventsource_stream::Eventsource;
use futures_util::stream::StreamExt;

pub trait HttpResponse<R> {
    fn convert_into(&self) -> R;
    fn new(content: String, end_time: u64) -> Self;
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HttpResponseError {
    pub message: String,
    pub r#type: String,
}

impl HttpResponseError {
    pub fn new(msg: &str, r#type: &str) -> HttpResponseError {
        HttpResponseError { message: msg.to_string(), r#type: r#type.to_string() }
    }

    pub fn to_error_string(&self) -> String {
        self.message.to_string()
    }
}

impl fmt::Display for HttpResponseError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}: {}", self.r#type, self.message)
    }
}

impl std::error::Error for HttpResponseError {
    fn description(&self) -> &str {
        &self.message
    }
}
pub trait HttpError {
    fn to_error(&self, status: String) -> Box<dyn std::error::Error>;
    fn to_error_string(&self, status: String) -> String;
}

pub trait HttpChunk {
    fn new(created: i64, status: &str, content: &str) -> Self;
}

pub struct HttpClient {}

impl HttpClient {
    async fn stream_request<S: Serialize + std::marker::Sync + 'static, D, R, E>(
        response: Response,
        /* callback: Mutex<impl FnMut(Result<(String, i64), String>) -> Result<Option<String>, String> + Copy + Send + 'static> */
        build_chunk: &mut impl FnMut(String, i64) -> Result<Option<String>, E>,
        sender: Sender<Result<R, E>>,
    )
        -> Result<R, Box<dyn std::error::Error>>
        where
            D: for<'de> Deserialize<'de> + HttpResponse<R> + std::marker::Send + 'static,
            R: HttpChunk + std::marker::Send + 'static,
            E: for<'de> Deserialize<'de> + HttpError + std::fmt::Debug + std::error::Error + 'static
    {

            let mut stream = response.bytes_stream().eventsource();
            let mut content = String::new();
            let created = chrono::Utc::now().timestamp_millis();
            // let mut callback = callback.lock().await;
            while let Some(event) = stream.next().await {
                match event {
                    Ok(event) => {
                        let data = event.data;
                        let chunk = build_chunk(data, created);
                        // callback(Ok((data, created)));
                        match chunk {
                            Ok(r) => {
                                let mut stop = false;
                                let command = match r {
                                    Some(chunk_content) => {
                                        content.push_str(chunk_content.as_str());
                                        R::new(
                                                chrono::Utc::now().timestamp_millis(),
                                                "success",
                                                &chunk_content
                                            )
                                        },
                                    None => {
                                        stop = true;
                                        R::new(
                                                chrono::Utc::now().timestamp_millis(),
                                                "finished",
                                                "done"
                                            )
                                    },
                                };
                                sender.send(Ok(command)).await?;
                                if stop {
                                    break;
                                } 
                            },
                            Err(e) => { sender.send(Err(e)).await?; },
                        }

                        /* let chunk = match
                            serde_json::from_str::<C>(&data)
                        {
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
                        } */
                    }
                    Err(error) => {
                        let message = format!("Failed to get event: {}", error);
                        println!("{}", message);
                        /* match callback {
                            Some(mut cb) => {
                                cb(Err(LlmError::new(&message, "FailedEvent")));
                            }
                            None => (),
                        } */
                        let err = HttpResponseError::new(&error.to_string(), "http_error");
                        return Err(Box::new(err));
                    }
                }
            }
            let end_time = 0;
            let response = D::new(content, end_time);
            // Ok(response)

        Ok(response.convert_into())
    }

    async fn request<S: Serialize + std::marker::Sync + 'static, D, R>(
        response: Response
    )
        -> Result<R, Box<dyn std::error::Error>>
        where
            D: for<'de> Deserialize<'de> + HttpResponse<R> + std::marker::Send + 'static,
            R: std::marker::Send
    {
        let response = match response.json::<D>().await {
                Ok(r) => r,
                Err(error) => {
                    println!("Failed to parse response: {}", error);
                    let err = HttpResponseError::new(&error.to_string(), "http_error");
                    return Err(Box::new(err));
                }
            };
        Ok(response.convert_into())
    }

    async fn get_response<S: Serialize + std::marker::Sync + 'static, D, R, E>(
        client_builder: RequestBuilder
    )
        -> Result<Response, Box<dyn std::error::Error>>
        where
            D: for<'de> Deserialize<'de> + HttpResponse<R> + std::marker::Send + 'static,
            R: HttpChunk + std::marker::Send,
            E: for<'de> Deserialize<'de> + HttpError + std::fmt::Debug + std::error::Error + 'static
    {
            let result = client_builder.send().await;
            let response = match result {
                Ok(res) => res,
                Err(error) => {
                    println!("Failed to get response: {}", error);
                    let err = HttpResponseError::new(&error.to_string(), "http_error");
                    return Err(Box::new(err));
                }
            };
            let status = response.status();
            if !status.is_success() {
                let error = match response.json::<E>().await {
                    Ok(t) => t,
                    Err(error) => {
                        println!("Failed to dezerialize error response: {}", error);
                        let err = HttpResponseError::new(&error.to_string(), "http_error");
                        return Err(Box::new(err));
                    }
                };
                println!("Failed to get response: {} {:?}", status, error);
                return Err(Box::new(error));
            }
            Ok(response)
    }

    pub async fn post_request<S: Serialize + std::marker::Sync + 'static, D, R, E>(
        url: String,
        parameters: S,
        secret_key: Option<&str>,
        is_stream: bool,
        /* callback: Mutex<
            impl (FnMut(Result<(String, i64), String>) -> Result<Option<String>, String>) + Copy + Send + 'static
        > */
        build_chunk: &mut impl FnMut(String, i64) -> Result<Option<String>, E>,
        sender: Sender<Result<R, E>>,
    )
        -> Result<R, Box<dyn std::error::Error>>
        where
            D: for<'de> Deserialize<'de> + HttpResponse<R> + std::marker::Send + 'static,
            R: HttpChunk + std::marker::Send + 'static,
            E: for<'de> Deserialize<'de> + HttpError + std::fmt::Debug + std::error::Error + 'static
    {
        let client_builder = Client::new().post(url);
        let client_builder = match secret_key {
            Some(secret) => client_builder.bearer_auth(&secret),
            None => client_builder,
        };
        let client_builder = client_builder.json(&parameters);

        let response = HttpClient::get_response::<S, D, R, E>(client_builder).await?;
        let result;
        if is_stream {
            result = HttpClient::stream_request::<S, D, R, E>(response, build_chunk, sender).await;
        } else {
            result = HttpClient::request::<S, D, R>(response).await;
        }
        result
    }
}
