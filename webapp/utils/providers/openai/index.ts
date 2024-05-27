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

import { z } from 'zod';
import {
  CompletionParametersDefinition,
  LlmParameters,
  Provider,
  ImplProvider,
  ProviderType,
} from '@/types';

const NAME = 'OpenAI';
const TYPE = ProviderType.openai;
const DESCRIPTION = 'OpenAI API';
const DEFAULT_SYSTEM = `
You are an expert in retrieving information.
`;
const DEFAULT_PARAMETERS: LlmParameters[] = [];

const openAIProviderTemplate: Partial<Provider> = {
  name: NAME,
  type: TYPE,
  description: DESCRIPTION,
  url: 'https://api.openai.com/v1',
  docUrl: 'https://platform.openai.com/docs',
  models: [
    {
      id: 'gpt-3.5-turbo',
      name: 'gpt-3.5 turbo',
      icon: { url: 'https://opla.github.io/models/assets/gpt-35.webp' },
      createdAt: 1677610602,
      updatedAt: 1677610602,
      creator: 'openai',
      contextWindow: 4096,
    },
    {
      id: 'gpt-3.5-turbo-16k',
      name: 'gpt-3.5 turbo 16k',
      icon: { url: 'https://opla.github.io/models/assets/gpt-35.webp' },
      createdAt: 1683758102,
      updatedAt: 1683758102,
      creator: 'openai',
      contextWindow: 16384,
    },
    {
      id: 'gpt-4o',
      name: 'gpt-4o',
      icon: { url: 'https://opla.github.io/models/assets/gpt-4.webp' },
      createdAt: 1715367049,
      updatedAt: 1715367049,
      creator: 'openai',
      contextWindow: 4096,
    },
    {
      id: 'gpt-4',
      name: 'gpt-4',
      icon: { url: 'https://opla.github.io/models/assets/gpt-4.webp' },
      createdAt: 1687882411,
      updatedAt: 1687882411,
      creator: 'openai',
      contextWindow: 8192,
    },
    {
      id: 'gpt-4-turbo-preview',
      name: 'gpt-4 turbo preview',
      icon: { url: 'https://opla.github.io/models/assets/gpt-4.webp' },
      createdAt: 1706037777,
      updatedAt: 1706037777,
      creator: 'openai',
      contextWindow: 4096,
    },
  ],
};

// https://platform.openai.com/docs/api-reference/chat/create
// TODO tools, tool_choice, user,
const CompletionParameters: CompletionParametersDefinition = {
  stream: {
    z: z.boolean().nullable().optional().default(false),
    name: 'Stream',
    type: 'boolean',
    defaultValue: true,
    description: 'Whether to stream back partial progress.',
  },
  temperature: {
    z: z.coerce.number().min(0).max(2).nullable().optional().default(1),
    name: 'Temperature',
    type: 'number',
    defaultValue: 1,
    min: 0,
    max: 2,
    description:
      'Number between 0.0 and 2.0 that controls randomness of token generation. Lower means more predictable.',
  },
  frequencyPenalty: {
    z: z.coerce.number().min(-2).max(2).nullable().optional().default(0),
    name: 'Frequency Penalty',
    type: 'number',
    defaultValue: 0,
    min: -20,
    max: 20,
    description:
      "Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.",
  },
  presencePenalty: {
    z: z.coerce.number().min(-2).max(2).nullable().optional().default(0),
    name: 'Presence Penalty',
    type: 'number',
    defaultValue: 0,
    min: -2,
    max: -2,
    description:
      "Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.",
  },
  seed: {
    z: z.coerce.number().nullable().optional(),
    name: 'Seed',
    type: 'number',
    defaultValue: 0,
    description: 'Integer seed for random number generation.',
  },
  stop: {
    z: z.string().nullable().optional().default('\n'),
    name: 'Stop',
    type: 'large-text',
    description: 'Up to 4 sequences where the API will stop generating further tokens.',
  },
  topP: {
    z: z.coerce.number().min(0).max(1).nullable().optional().default(1),
    name: 'Top P',
    type: 'number',
    defaultValue: 1,
    min: 0,
    max: 1,
    description:
      'An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. We generally recommend altering this or temperature but not both.',
  },
  maxTokens: {
    z: z.coerce.number().multipleOf(0.001).min(1).nullable().optional().default(64),
    name: 'Max Tokens',
    type: 'number',
    defaultValue: 64,
    min: 1,
    description:
      'The maximum number of tokens that can be generated in the chat completion. (One token is roughly 4 characters for normal English text)',
  },
};

const OpenAIProvider: ImplProvider = {
  name: NAME,
  type: TYPE,
  description: DESCRIPTION,
  system: DEFAULT_SYSTEM,
  defaultParameters: DEFAULT_PARAMETERS,
  template: openAIProviderTemplate,
  completion: {
    parameters: CompletionParameters,
  },
};

export default OpenAIProvider;
