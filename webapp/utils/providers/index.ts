// Copyright 2024 mik
//

import { LlmMessage, LlmQueryCompletion, Message, Model, Provider, ProviderType } from '@/types';
import { completion as openAICompletion } from './openai';
import { completion as oplaCompletion } from './opla';
import { findProvider } from '../data/providers';
import { getContent } from '../data';

const completion = async (
  model: Model | undefined,
  providerName: string | undefined,
  context: { providers: Provider[] },
  threadMessages: Message[],
  system?: string,
  properties?: Partial<LlmQueryCompletion>,
): Promise<string> => {
  if (!model) {
    throw new Error('Model not set');
  }
  const providerIdOrName = providerName || model?.provider;
  const provider = findProvider(providerIdOrName, context.providers);
  const messages: LlmMessage[] = threadMessages.map((m) => ({
    content: getContent(m.content),
    role: m.author?.role === 'user' ? 'user' : 'assistant',
    name: m.author?.name,
  }));
  if (provider?.type === ProviderType.openai) {
    return openAICompletion(model, provider, messages, system, properties);
  }
  return oplaCompletion(model, provider, messages, system, properties);
};

const models = async (provider: Provider): Promise<Model[]> => {
  if (provider.type === ProviderType.openai) {
    return [];
  }
  return [];
};

export { completion, models };
