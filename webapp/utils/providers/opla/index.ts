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

// https://github.com/ggerganov/llama.cpp/blob/master/examples/server/README.md
// TODO: logit_bias, n_probs, image_data, slot_id, cache_prompt, system_prompt
export const CompletionParameters: CompletionParametersDefinition = {
  stream: {
    z: z.coerce.boolean().nullable().optional().default(false),
    type: 'boolean',
    defaultValue: false,
    name: 'Stream',
    description:
      'It allows receiving each predicted token in real-time instead of waiting for the completion to finish. To enable this, set to true.',
  },
  temperature: {
    z: z.coerce.number().min(0).nullable().optional().default(0.8),
    type: 'number',
    defaultValue: 0.8,
    min: 0,
    max: 1,
    name: 'Temperature',
    description: 'Adjust the randomness of the generated text (default: 0.8).',
  },
  frequencyPenalty: {
    z: z.coerce.number().nullable().optional().default(0.0),
    type: 'number',
    defaultValue: 0.0,
    name: 'Frequency_penalty',
    description: 'Repeat alpha frequency penalty (default: 0.0, 0.0 = disabled).',
  },
  presencePenalty: {
    z: z.coerce.number().nullable().optional().default(0.0),
    type: 'number',
    defaultValue: 0.0,
    name: 'Presence_penalty',
    description: 'Repeat alpha presence penalty (default: 0.0, 0.0 = disabled).',
  },
  seed: {
    z: z.coerce.number().nullable().optional().default(-1),
    name: 'Seed',
    type: 'number',
    defaultValue: -1,
    description: 'Set the random number generator (RNG) seed (default: -1, -1 = random seed).',
  },
  stop: {
    z: z.string().nullable().optional().default('[]'),
    name: 'Stop',
    type: 'large-text',
    description:
      'Specify a JSON array of stopping strings. These words will not be included in the completion, so make sure to add them to the prompt for the next iteration (default: []).',
  },
  topP: {
    z: z.coerce.number().min(0).nullable().optional().default(0.95),
    type: 'number',
    defaultValue: 0.95,
    min: 0,
    name: 'Top_p',
    description:
      'Limit the next token selection to a subset of tokens with a cumulative probability above a threshold P (default: 0.95).',
  },
  topK: {
    z: z.coerce.number().min(0).nullable().optional().default(40),
    type: 'number',
    defaultValue: 40,
    min: 0,
    name: 'Top_k',
    description: 'Limit the next token selection to the K most probable tokens (default: 40).',
  },
  minP: {
    z: z.coerce.number().min(0).nullable().optional().default(0.05),
    type: 'number',
    defaultValue: 0.05,
    min: 0,
    name: 'Min_p',
    description:
      'The minimum probability for a token to be considered, relative to the probability of the most likely token (default: 0.05).',
  },
  nPredict: {
    z: z.coerce.number().nullable().optional().default(-1),
    type: 'number',
    defaultValue: -1,
    name: 'N_predict',
    description:
      'Set the maximum number of tokens to predict when generating text. Note: May exceed the set limit slightly if the last token is a partial multibyte character. When 0, no tokens will be generated but the prompt is evaluated into the cache. (default: -1, -1 = infinity).',
  },
  nKeep: {
    z: z.coerce.number().nullable().optional().default(0),
    type: 'number',
    defaultValue: 0,
    name: 'N_keep',
    description:
      'Specify the number of tokens from the prompt to retain when the context size is exceeded and tokens need to be discarded. By default, this value is set to 0 (meaning no tokens are kept). Use -1 to retain all tokens from the prompt.',
  },
  tfsZ: {
    z: z.coerce.number().nullable().optional().default(1.0),
    type: 'number',
    defaultValue: 1.0,
    name: 'Tfs_z',
    description: 'Enable tail free sampling with parameter z (default: 1.0, 1.0 = disabled).',
  },
  typicalP: {
    z: z.coerce.number().nullable().optional().default(1.0),
    type: 'number',
    defaultValue: 1.0,
    name: 'Typical_p',
    description: 'Enable locally typical sampling with parameter p (default: 1.0, 1.0 = disabled).',
  },
  repeatPenalty: {
    z: z.coerce.number().nullable().optional().default(1.1),
    type: 'number',
    defaultValue: 1.1,
    name: 'Repeat_penalty',
    description: 'Control the repetition of token sequences in the generated text (default: 1.1).',
  },
  repeatLastN: {
    z: z.coerce.number().nullable().optional().default(64),
    type: 'number',
    defaultValue: 64,
    name: 'Repeat_last_n',
    description:
      'Last n tokens to consider for penalizing repetition (default: 64, 0 = disabled, -1 = ctx-size).',
  },
  penalizeNL: {
    z: z.coerce.boolean().nullable().optional().default(true),
    type: 'boolean',
    defaultValue: true,
    name: 'Penalize_nl',
    description:
      'Last n tokens to consider for penalizing repetition (default: 64, 0 = disabled, -1 = ctx-size).',
  },
  penaltyPrompt: {
    z: z.coerce.string().nullable().optional(),
    type: 'large-text',
    name: 'Penalty_prompt',
    description:
      'This will replace the prompt for the purpose of the penalty evaluation. Can be either null, a string or an array of numbers representing tokens (default: null = use the original prompt).',
  },
  mirostat: {
    z: z.coerce.number().nullable().optional().default(0),
    type: 'number',
    defaultValue: 0,
    name: 'Mirostat',
    description:
      'Enable Mirostat sampling, controlling perplexity during text generation (default: 0, 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0).',
  },
  mirostatTau: {
    z: z.coerce.number().nullable().optional().default(5.0),
    type: 'number',
    defaultValue: 5.0,
    name: 'Mirostat_tau',
    description: 'Set the Mirostat target entropy, parameter tau (default: 5.0).',
  },
  mirostatEta: {
    z: z.coerce.number().nullable().optional().default(0.1),
    type: 'number',
    defaultValue: 0.1,
    name: 'Mirostat_eta',
    description: 'Set the Mirostat learning rate, parameter eta (default: 0.1).',
  },
  grammar: {
    // TODO make it correct
    z: z.coerce.string().nullable().optional(),
    type: 'text',
    name: 'Grammar',
    description: 'Set grammar for grammar-based sampling (default: no grammar).',
  },
  ignoreEos: {
    z: z.coerce.boolean().nullable().optional().default(false),
    type: 'boolean',
    defaultValue: false,
    name: 'ignore_eos',
    description: 'Ignore end of stream token and continue generating (default: false).',
  },
};

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
