// Copyright 2024 mik
//

import { Model, Provider, ProviderType } from '@/types';
import { completion as openAICompletion } from './openai';
import { completion as oplaCompletion } from './opla';
import { getProvider } from '../data/providers';

const completion = async (
  model: Model | undefined,
  context: { providers: Provider[] },
  input: string,
  system?: string,
  properties = {
    n_predict: 200,
    temperature: 0,
    stop: ['Llama:', 'User:', 'Question:'],
  },
): Promise<string> => {
  if (!model) {
    throw new Error('Model not found');
  }
  const providerIdOrName = model?.provider;
  const provider = getProvider(providerIdOrName, context.providers);
  if (provider?.type === ProviderType.openai) {
    return openAICompletion(model, input, system, properties);
  }
  return oplaCompletion(model, input, system, properties);
};

const models = async (provider: Provider): Promise<Model[]> => {
  if (provider.type === ProviderType.openai) {
    return [];
  }
  return [];
};

export { completion, models };
