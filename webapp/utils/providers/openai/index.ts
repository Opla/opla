// Copyright 2024 mik
//

import { LlmResponse, Model, Provider, ProviderType } from '@/types';
import logger from '@/utils/logger';
import { invokeTauri } from '@/utils/tauri';

const NAME = 'OpenAI';
const TYPE = ProviderType.openai;
const DEFAULT_SYSTEM = `
You are an expert in retrieving information.
Question: {{QUESTION}}
Answer:
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
  input: string,
  system = DEFAULT_SYSTEM,
  properties = {
    n_predict: 200,
    temperature: 0,
    stop: ['User:', 'Question:'],
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
    llmProvider: TYPE,
    query: { command: 'completion', parameters },
  })) as LlmResponse;

  const { content } = response;
  if (content) {
    logger.info(`${NAME} completion response`, content);
    return content.trim();
  }
  throw new Error(`${NAME} completion completion error ${response}`);
};
