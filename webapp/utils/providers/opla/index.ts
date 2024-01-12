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

import logger from "@/utils/logger";

const api = 'http://localhost:8080';

type Request = {
    method: "POST" | "GET" | "PUT" | "DELETE" | "PATCH",
    headers: Record<string, string>,
    body?: any,
};

type CompletionData = {
    content: string,
};

const fetch = async (url: string, request: Request) => {
    const { Body, fetch: fetchTauri, ResponseType } = await import('@tauri-apps/api/http');
    const response = await fetchTauri(url, {
        method: request.method,
        body: Body.json(request.body),
        headers: request.headers,
        timeout: 30,
        responseType: ResponseType.JSON,
    });
    logger.info('LLama.cpp fetch response', response);
    return response;

}

const DEFAULT_SYSTEM = `
You are an expert in retrieving information.
Question: {{QUESTION}}
Thought: Let us the above reference document to find the answer.
Answer:
`;

const completion = async (input: string, system = DEFAULT_SYSTEM): Promise<string> => {
    const prompt = system.replace('{{QUESTION}}', input);
    const method = 'POST';
    const headers = {
        'Content-Type': 'application/json'
    };
    const stop = ['Llama:', 'User:', 'Question:'];
    const body = {
        prompt,
        stop,
        n_predict: 200,
        temperature: 0
    };
    const request: Request = { method, headers, body };
    const response = await fetch(`${api}/completion`, request);
    const { data } = response;
    if (response.ok) {
        logger.info('LLama.cpp completion data', data);
        const { content } = data as CompletionData;
        return content.trim();
    }
    logger.info('LLama.cpp completion error', data);
    return 'error';
}

export { api, completion }