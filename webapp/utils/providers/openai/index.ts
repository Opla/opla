// Copyright 2024 mik
//

import { z } from 'zod';
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
import { mapKeys } from '@/utils/data';
import logger from '@/utils/logger';
import { toSnakeCase } from '@/utils/string';
import { invokeTauri } from '@/utils/tauri';

const NAME = 'OpenAI';
const TYPE = ProviderType.openai;
const DESCRIPTION = 'OpenAI API';
const DEFAULT_SYSTEM = `
You are an expert in retrieving information.
`;

export const openAIProviderTemplate: Partial<Provider> = {
  name: NAME,
  type: TYPE,
  description: DESCRIPTION,
  url: 'https://api.openai.com/v1',
  docUrl: 'https://platform.openai.com/docs',
  models: [
    {
      id: 'gpt-3.5-turbo',
      name: 'gpt-3.5 turbo',
      createdAt: 1677610602,
      updatedAt: 1677610602,
      creator: 'openai',
    },
    {
      id: 'gpt-4',
      name: 'gpt-4',
      createdAt: 1687882411,
      updatedAt: 1687882411,
      creator: 'openai',
    },
  ],
};

export const completion = async (
  model: Model | undefined,
  provider: Provider | undefined,
  messages: LlmMessage[],
  system = DEFAULT_SYSTEM,
  properties: Partial<LlmQueryCompletion> = {},
): Promise<string> => {
  if (!model) {
    throw new Error('Model not found');
  }

  const systemMessage: LlmMessage = {
    role: 'system',
    content: system,
  };

  const parameters: LlmQueryCompletion = mapKeys(
    {
      messages: [systemMessage, ...messages],
      ...properties,
    },
    toSnakeCase,
  );
  const response: LlmResponse = (await invokeTauri('llm_call_completion', {
    model: model.id,
    llmProvider: provider,
    query: { command: 'completion', parameters },
  })) as LlmResponse;

  const { content } = response;
  if (content) {
    logger.info(`${NAME} completion response`, content);
    return content.trim();
  }
  throw new Error(`${NAME} completion completion error ${response}`);
};

// https://platform.openai.com/docs/api-reference/chat/create
// TODO tools, tool_choice, user, 
export const CompletionParameters: CompletionParametersDefinition = {
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

const OpenAIProvider: ProviderDefinition = {
  name: NAME,
  type: TYPE,
  description: DESCRIPTION,
  system: DEFAULT_SYSTEM,
  template: openAIProviderTemplate,
  completion: {
    parameters: CompletionParameters,
    invoke: completion,
  },
};

export default OpenAIProvider;
