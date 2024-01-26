// Copyright 2024 mik
//

import {
  LlmMessage,
  LlmQueryCompletion,
  LlmResponse,
  Model,
  Provider,
  ProviderType,
} from '@/types';
import logger from '@/utils/logger';
import { invokeTauri } from '@/utils/tauri';

const NAME = 'OpenAI';
const TYPE = ProviderType.openai;
const DEFAULT_SYSTEM = `
You are an expert in retrieving information.
`;

export const openAIProviderTemplate: Partial<Provider> = {
  name: 'OpenAI',
  type: TYPE,
  description: 'OpenAI API',
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

  const parameters: LlmQueryCompletion = {
    messages: [systemMessage, ...messages],
    ...properties,
  };
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
