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
  LlmMessage,
  LlmQueryCompletion,
  LlmResponse,
  Model,
  Provider,
  ProviderObject,
  ProviderType,
} from '@/types';
import logger from '@/utils/logger';
import { invokeTauri } from '@/utils/tauri';
import { z } from 'zod';

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

export const completionPresetKeys = {
  frequencyPenalty: 'Frequency Penalty',
  maxTokens: 'Max Tokens',
  presencePenalty: 'Presence Penalty',
  seed: 'Seed',
  stop: 'Stop',
  stream: 'Stream',
  temperature: 'Temperature',
  topP: 'Top P',
};

export const CompletionParametersSchema = z.object({
  frequencyPenalty: z.coerce
    .number()
    .min(-20)
    .max(20)
    .nullable()
    .optional()
    .default(0)
    .describe(
      "Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.",
    ),
  maxTokens: z.coerce
    .number()
    .min(1)
    .nullable()
    .optional()
    .default(512)
    .describe(
      'The maximum number of tokens that can be generated in the chat completion. (One token is roughly 4 characters for normal English text)',
    ),
  // n: z.coerce.number().min(1).nullable().optional().default(1).describe('Number of completions to generate for each prompt.'),
  presencePenalty: z.coerce
    .number()
    .min(-2)
    .max(2)
    .nullable()
    .optional()
    .default(0)
    .describe(
      "Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.",
    ),
  seed: z.coerce
    .number()
    .nullable()
    .optional()
    .describe('Integer seed for random number generation.'),
  stop: z
    .string()
    .nullable()
    .optional()
    .default('\n')
    .describe('Up to 4 sequences where the API will stop generating further tokens.'),
  stream: z
    .boolean()
    .nullable()
    .optional()
    .default(false)
    .describe('Whether to stream back partial progress.'),
  temperature: z.coerce
    .number()
    .min(0)
    .nullable()
    .optional()
    .default(1)
    .describe(
      'Number between 0.0 and 2.0 that controls randomness of token generation. Lower means more predictable.',
    ),
  topP: z.coerce
    .number()
    .min(0)
    .max(1)
    .nullable()
    .optional()
    .default(1)
    .describe(
      'An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. We generally recommend altering this or temperature but not both.',
    ),
});

const OplaProvider: ProviderObject = {
  name: NAME,
  type: TYPE,
  description: DESCRIPTION,
  system: DEFAULT_SYSTEM,
  template: {}, // TODO: add template
  completion: {
    presetKeys: completionPresetKeys,
    schema: CompletionParametersSchema,
    invoke: completion,
  },
};

export default OplaProvider;
