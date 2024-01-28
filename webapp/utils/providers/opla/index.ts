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

import {
  CompletionParametersDefinition,
  LlmMessage,
  LlmQueryCompletion,
  LlmResponse,
  Model,
  Provider,
  ProviderDefinition,
  ProviderType,
} from '@/types';
import logger from '@/utils/logger';
import { invokeTauri } from '@/utils/tauri';

const NAME = 'Opla';
const TYPE = ProviderType.opla;
const DESCRIPTION = 'Opla Open source local LLM';
const DEFAULT_SYSTEM = 'You are an expert in retrieving information.\n';

const DEFAULT_PROPERTIES: Partial<LlmQueryCompletion> = {
  nPredict: 200,
  temperature: 0,
  stop: ['Llama:', 'User:', 'Question:'],
};

const completion = async (
  model: Model | undefined,
  provider: Provider | undefined,
  messages: LlmMessage[],
  system = DEFAULT_SYSTEM,
  properties: Partial<LlmQueryCompletion> = DEFAULT_PROPERTIES,
): Promise<string> => {
  if (!model) {
    throw new Error('Model not found');
  }

  const systemMessage: LlmMessage = {
    role: 'system',
    content: system,
  };

  const parameters: LlmQueryCompletion = {
    messages: [systemMessage, ...messages],
    ...properties,
  };

  const response: LlmResponse = (await invokeTauri('llm_call_completion', {
    model: model.name,
    llmProvider: provider,
    query: { command: 'completion', parameters },
  })) as LlmResponse;

  const { content } = response;
  if (content) {
    logger.info(`${NAME} completion response`, content);
    return content.trim();
  }
  throw new Error(`${NAME} completion error ${response}`);
};

export { DEFAULT_SYSTEM, completion };

export const CompletionParameters: CompletionParametersDefinition = {};

const OplaProvider: ProviderDefinition = {
  name: NAME,
  type: TYPE,
  description: DESCRIPTION,
  system: DEFAULT_SYSTEM,
  template: {}, // TODO: add template
  completion: {
    parameters: CompletionParameters,
    invoke: completion,
  },
};

export default OplaProvider;
