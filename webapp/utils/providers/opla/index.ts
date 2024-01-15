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

import { LlmResponse, Model } from '@/types';
import logger from '@/utils/logger';
import { invokeTauri } from '@/utils/tauri';

const DEFAULT_SYSTEM = `
You are an expert in retrieving information.
Question: {{QUESTION}}
Answer:
`;

const completion = async (
  model: Model | undefined,
  input: string,
  system = DEFAULT_SYSTEM,
  properties = {
    n_predict: 200,
    temperature: 0,
    stop: ['Llama:', 'User:', 'Question:'],
  },
): Promise<string> => {
  if (!model) {
    throw new Error('Model not found');
  }

  const prompt = system.replace('{{QUESTION}}', input);

  const parameters = {
    prompt,
    ...properties,
  };

  const response: LlmResponse = (await invokeTauri('llm_call_completion', {
    model: model.name,
    llmProvider: 'opla',
    query: { command: 'completion', parameters },
  })) as LlmResponse;

  const { content } = response;
  if (content) {
    logger.info('LLama.cpp completion response', content);
    return content.trim();
  }
  throw new Error(`LLama.cpp completion error ${response}`);
};

export { DEFAULT_SYSTEM, completion };
