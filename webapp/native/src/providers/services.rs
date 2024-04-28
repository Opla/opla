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

use reqwest::{ Client, RequestBuilder, Response };
use serde::{ Deserialize, Serialize };
use tokio::sync::mpsc::Sender;

use crate::{
    providers::ProviderAdapter,
    utils::http_client::{
        HttpChunk,
        HttpClient,
        HttpError,
        HttpResponse,
        HttpResponseError,
        NewHttpError,
    },
};

pub struct HttpService<S, D, R, E> {
    pub adapter: ProviderAdapter,
    pub url: String,
    pub body: S,
    pub secret_key: Option<String>,
    pub input: Option<D>,
    pub output: Option<R>,
    pub error: Option<E>,
}

impl<S: Serialize + std::marker::Sync + 'static + Clone, D, R, E> HttpService<S, D, R, E>
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
    pub fn post(
        url: String,
        body: S,
        secret_key: Option<String>,
        adapter: &mut ProviderAdapter
    ) -> Self {
        HttpService {
            url,
            body: body.clone(),
            secret_key,
            adapter: adapter.clone(),
            input: None,
            output: None,
            error: None,
        }
    }

    async fn request(
        response: Response,
        adapter: &mut ProviderAdapter,
        sender: Sender<Result<R, E>>
    )
        -> Result<R, String>
        where
            D: for<'de> Deserialize<'de> + HttpResponse<R> + std::marker::Send + 'static,
            R: std::marker::Send
    {
        // adapter.handle_input_response();
        let result = response.bytes().await.map_err(|err| err.to_string())?;
        let response = match adapter.deserialize_response::<D, E>(result) {
            Ok(r) => r,
            Err(error) => {
                println!("Failed to parse response: {}", error);
                let err = HttpResponseError::new(&error.to_string(), "http_error");
                return Err(err.to_string());
            }
        };
        /* let response = match response.json::<D>().await {
            Ok(r) => r,
            Err(error) => {
                println!("Failed to parse response: {}", error);
                let err = HttpResponseError::new(&error.to_string(), "http_error");
                return Err(err.to_string());
            }
        }; */
        adapter.response_to_output();
        sender.send(Ok(response.convert_into())).await.map_err(|_e| String::from("Can't send"))?;
        Ok(response.convert_into())
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

    pub async fn run(&mut self, is_stream: bool, sender: Sender<Result<R, E>>) {
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
                &mut self.adapter,
                sender
            ).await;
        } else {
            _result = HttpService::<S, D, R, E>::request(response, &mut self.adapter, sender).await;
        }
    }
}
