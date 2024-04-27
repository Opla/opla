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

use reqwest::{ Client, RequestBuilder, Response };
use serde::{ Deserialize, Serialize };
use eventsource_stream::Eventsource;
use futures_util::stream::StreamExt;
use tokio::sync::mpsc::Sender;

use crate::providers::Worker;

pub trait HttpResponse<R> {
    fn convert_into(&self) -> R;
    fn new(content: String, end_time: u64) -> Self;
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HttpResponseError {
    pub message: String,
    pub status: String,
}

pub trait HttpResponseErr {
    fn create<R, E>(msg: &str, status: &str) -> Result<R, E>;
}

pub trait NewHttpError {
    fn new(msg: &str, status: &str) -> Self;
}

impl HttpResponseError {
    pub fn new(msg: &str, status: &str) -> HttpResponseError {
        HttpResponseError { message: msg.to_string(), status: status.to_string() }
    }

    pub fn to_error_string(&self) -> String {
        self.message.to_string()
    }
}

impl fmt::Display for HttpResponseError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}: {}", self.status, self.message)
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
    async fn stream_request<D, R: Serialize + Clone, E: Serialize + Clone>(
        response: Response,
        worker: &mut Worker,
        sender: Sender<Result<R, E>>
    )
        -> Result<R, String>
        where
            D: for<'de> Deserialize<'de> + HttpResponse<R> + std::marker::Send + 'static,
            R: HttpChunk + std::marker::Send + 'static,
            E: for<'de> Deserialize<'de> +
                HttpError +
                NewHttpError +
                std::fmt::Debug +
                std::error::Error +
                'static
    {
        let mut stream = response.bytes_stream().eventsource();
        let mut content = String::new();
        let created = chrono::Utc::now().timestamp_millis();
        while let Some(event) = stream.next().await {
            match event {
                Ok(event) => {
                    let data = event.data;
                    worker.handle_chunk_response();
                    let chunk = worker.build_stream_chunk::<E>(data, created);
                    match chunk {
                        Ok(r) => {
                            let mut stop = false;
                            let response = match r {
                                Some(chunk_content) => {
                                    content.push_str(chunk_content.as_str());
                                    R::new(
                                        chrono::Utc::now().timestamp_millis(),
                                        "success",
                                        &chunk_content
                                    )
                                }
                                None => {
                                    stop = true;
                                    R::new(
                                        chrono::Utc::now().timestamp_millis(),
                                        "finished",
                                        "done"
                                    )
                                }
                            };
                            // sender.send(Ok(response)).await?;
                            sender.send(Ok(response)).await.map_err(|e| e.to_string())?;
                            if stop {
                                break;
                            }
                        }
                        Err(e) => {
                            sender.send(Err(e)).await.map_err(|e| e.to_string())?;
                        }
                    }
                }
                Err(error) => {
                    let message = format!("Failed to get event: {}", error);
                    println!("{}", message);
                    let err = HttpResponseError::new(&error.to_string(), "http_error");
                    return Err(err.to_string());
                }
            }
        }
        worker.response_to_output();
        let end_time = 0;
        let response = D::new(content, end_time);
        sender.send(Ok(response.convert_into())).await.map_err(|e| e.to_string())?;
        // Ok(response)
        Ok(response.convert_into())
    }

    async fn request<D, R: Serialize + Clone, E: Serialize + Clone>(
        response: Response,
        worker: &mut Worker,
        sender: Sender<Result<R, E>>
    )
        -> Result<R, String>
        where
            D: for<'de> Deserialize<'de> + HttpResponse<R> + std::marker::Send + 'static,
            R: std::marker::Send
    {
        worker.handle_input_response();
        let response = match response.json::<D>().await {
            Ok(r) => r,
            Err(error) => {
                println!("Failed to parse response: {}", error);
                let err = HttpResponseError::new(&error.to_string(), "http_error");
                return Err(err.to_string());
            }
        };
        worker.response_to_output();
        sender.send(Ok(response.convert_into())).await.map_err(|_e| String::from("Can't send"))?;
        Ok(response.convert_into())
    }

    async fn get_response<E>(
        client_builder: RequestBuilder
    ) -> Result<Response, Box<dyn std::error::Error>>
        where
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

    pub async fn post_request<
        S: Serialize + std::marker::Sync + 'static,
        D,
        R: Serialize + Clone,
        E: Serialize + Clone
        >(
        url: String,
        body: S,
        secret_key: Option<&str>,
        is_stream: bool,
        worker: &mut Worker,
        sender: Sender<Result<R, E>>
    )
        -> ()
        where
            D: for<'de> Deserialize<'de> + HttpResponse<R> + std::marker::Send + 'static,
            R: HttpChunk + std::marker::Send + 'static,
            E: for<'de> Deserialize<'de> +
                HttpError +
                NewHttpError +
                std::fmt::Debug +
                std::error::Error +
                'static
    {
        let client_builder = Client::new().post(url);
        let client_builder = match secret_key {
            Some(secret) => client_builder.bearer_auth(&secret),
            None => client_builder,
        };
        let client_builder = client_builder.json(&body);

        let response = match HttpClient::get_response::<E>(client_builder).await {
            Ok(r) => r,
            Err(err) => {
                println!("HttpClient getResponse error {}", err);
                // sender.send(E::create(&format!("HttpClient getResponse error {}", err), "httpclient"));
                return;
            }
        };
        let _result;
        if is_stream {
            _result = HttpClient::stream_request::<D, R, E>(response, worker, sender).await;
        } else {
            _result = HttpClient::request::<D, R, E>(response, worker, sender).await;
        }
        // result
    }
}

pub struct HttpConnection<S, D, R, E> {
    pub worker: Worker,
    pub url: String,
    pub body: S,
    pub secret_key: Option<String>,
    pub input: Option<D>,
    pub output: Option<R>,
    pub error: Option<E>,
}

impl<S: Serialize + std::marker::Sync + 'static + Clone, D, R, E> HttpConnection<S, D, R, E>
    where
        D: Serialize +
            Clone +
            for<'de> Deserialize<'de> +
            HttpResponse<R> +
            std::marker::Send +
            'static,
        R: Serialize + Clone + HttpChunk + std::marker::Send + 'static,
        E: Serialize +
            Clone +
            for<'de> Deserialize<'de> +
            HttpError +
            NewHttpError +
            std::fmt::Debug +
            std::error::Error +
            'static
{
    pub fn post(url: String, body: S, secret_key: Option<String>, worker: &mut Worker) -> Self {
        HttpConnection {
            url,
            body: body.clone(),
            secret_key,
            worker: worker.clone(),
            input: None,
            output: None,
            error: None,
        }
    }

    async fn get_response(&mut self, client_builder: RequestBuilder) -> Result<Response, E>
        where
            E: for<'de> Deserialize<'de> +
                HttpError +
                NewHttpError +
                std::fmt::Debug +
                std::error::Error +
                'static
    {
        let result = client_builder.send().await;
        let response = match result {
            Ok(res) => res,
            Err(error) => {
                println!("Failed to get response: {}", error);
                let err = E::new(&error.to_string(), "http_error");
                return Err(err);
            }
        };
        let status = response.status();
        if !status.is_success() {
            let result = response.bytes().await.map_err(|err| E::new(&err.to_string(), "Http client"));
            let error = self.worker.deserialize_response_error::<E>(result);
            println!("Failed to get response: {:?}", error);
            return Err(error);
        }
        Ok(response)
    }

    pub async fn fetch(&mut self, is_stream: bool, sender: Sender<Result<R, E>>) {
        let client_builder = Client::new().post(&self.url);
        let client_builder = match &self.secret_key {
            Some(secret) => client_builder.bearer_auth(&secret),
            None => client_builder,
        };
        let client_builder = client_builder.json(&self.body);
        let response = match self.get_response(client_builder).await {
            Ok(r) => r,
            Err(err) => {
                println!("HttpClient getResponse error {}", err);
                let _ = sender.send(Err(err)).await;
                return;
            }
        };
        let _result;
        if is_stream {
            _result = HttpClient::stream_request::<D, R, E>(
                response,
                &mut self.worker,
                sender
            ).await;
        } else {
            _result = HttpClient::request::<D, R, E>(response, &mut self.worker, sender).await;
        }
    }
}
