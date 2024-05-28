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

use reqwest::{ header::{ HeaderValue, CONTENT_TYPE }, Client, RequestBuilder, Response };
use serde::{ Deserialize, Serialize };
use eventsource_stream::Eventsource;
use futures_util::stream::StreamExt;

use crate::{
    providers::ProviderAdapter,
    utils::http_client::{ HttpChunk, HttpError, NewHttpError },
};

use super::llm::LlmResponseImpl;

pub struct HttpService<R, E> {
    pub adapter: ProviderAdapter,
    pub url: String,
    pub body: Result<Vec<u8>, E>,
    pub secret_key: Option<String>,
    pub output: Option<R>,
    pub error: Option<E>,
}

impl<R, E> HttpService<R, E>
    where
        R: Serialize + Clone + LlmResponseImpl + HttpChunk + std::marker::Send + 'static,
        E: Serialize +
            Clone +
            for<'de> Deserialize<'de> +
            HttpError +
            NewHttpError +
            std::fmt::Debug +
            std::error::Error +
            'static
{
    pub fn post<S: Serialize + std::marker::Sync + 'static + Clone>(
        url: String,
        body: S,
        secret_key: Option<String>,
        adapter: &mut ProviderAdapter
    ) -> Self {
        HttpService {
            url,
            body: adapter.serialize_parameters(body),
            secret_key,
            adapter: adapter.clone(),
            output: None,
            error: None,
        }
    }

    pub async fn stream_request(
        &mut self,
        response: Response,
        // sender: Sender<Result<R, E>>
        mut send: impl FnMut(Result<R, E>) -> ()
    )
        -> Result<R, E>
        where
            R: HttpChunk + std::marker::Send + 'static,
            E: for<'de> Deserialize<'de> +
                HttpError +
                NewHttpError +
                std::fmt::Debug +
                std::error::Error +
                'static
    {
        let mut stream = response.bytes_stream().eventsource();
        // let mut content = String::new();
        // let created = chrono::Utc::now().timestamp_millis();
        self.adapter.reset_content();
        while let Some(event) = stream.next().await {
            match event {
                Ok(event) => {
                    let data = event.data;
                    let (stop, result) = self.adapter.handle_chunk_response::<R, E>(data);
                    send(result);
                    /* sender
                        .send(result).await
                        .map_err(|err| E::new(&err.to_string(), "http_service"))?; */
                    /* let chunk = self.adapter.build_stream_chunk::<E>(data, created);
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
                    } */
                    if stop {
                        break;
                    }
                }
                Err(error) => {
                    let message = format!("Failed to get event: {}", error);
                    println!("{}", message);
                    let err = E::new(&error.to_string(), "http_service");
                    return Err(err);
                }
            }
        }
        let result = self.adapter.response_to_output::<R, E>();
        send(result.clone());
        // sender.send(result.clone()).await.map_err(|err| E::new(&err.to_string(), "http_service"))?;
        // let end_time = 0;
        // let response = D::new(content, end_time);
        // sender.send(Ok(response.convert_into())).await.map_err(|e| e.to_string())?;
        // Ok(response)
        // Ok(response.convert_into())
        result
    }

    async fn request(
        response: Response,
        adapter: &mut ProviderAdapter,
        mut send: impl FnMut(Result<R, E>) -> ()
        // sender: Sender<Result<R, E>>
    ) -> Result<R, E>
        where R: std::marker::Send
    {
        // adapter.handle_input_response();
        let result = response
            .bytes().await
            .map_err(|err| E::new(&err.to_string(), "http_service"))?;
        let response = match adapter.deserialize_response::<R, E>(result) {
            Ok(r) => r,
            Err(error) => {
                println!("Failed to parse response: {}", error);
                return Err(error);
            }
        };
        // adapter.response_to_output();
        let result = Ok(response);
        // sender.send(result.clone()).await.map_err(|err| E::new(&err.to_string(), "http_service"))?;
        send(result.clone());
        result
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
            let result = response
                .bytes().await
                .map_err(|err| E::new(&err.to_string(), "Http client"));
            let error = self.adapter.deserialize_response_error::<E>(result);
            println!("Failed to get response: {:?}", error);
            return Err(error);
        }
        Ok(response)
    }

    pub async fn run(
        &mut self,
        is_stream: bool,
        /* sender: Sender<Result<R, E>> */ mut send: impl FnMut(Result<R, E>) -> ()
    ) {
        let body = match &self.body {
            Ok(body) => body.clone(),
            Err(err) => {
                println!("HttpClient body error {}", err);
                let _ = send(Err(err.clone()));
                return;
            }
        };
        let client_builder = Client::new().post(&self.url);
        let client_builder = match &self.secret_key {
            Some(secret) => client_builder.bearer_auth(&secret),
            None => client_builder,
        };
        // let client_builder = client_builder.json(&self.body);
        let client_builder = client_builder
            .body(body)
            .header(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        let response = match self.get_response(client_builder).await {
            Ok(r) => r,
            Err(err) => {
                println!("HttpClient getResponse error {}", err);
                let _ = send(Err(err));
                return;
            }
        };
        let _result;
        if is_stream {
            _result = self.stream_request(response, send).await;
        } else {
            _result = HttpService::<R, E>::request(response, &mut self.adapter, send).await;
        }
    }
}
