// Copyright 2024 mik
//

import {
  CompletionParametersDefinition,
  LlmMessage,
  LlmParameters,
  LlmResponse,
  Message,
  Model,
  Provider,
  ProviderType,
} from '@/types';
import OpenAI from './openai';
import Opla from './opla';
import { findProvider } from '../data/providers';
import { getContent } from '../data';

const completion = async (
  model: Model | undefined,
  providerName: string | undefined,
  context: { providers: Provider[] },
  threadMessages: Message[],
  system?: string,
  conversationId?: string,
  parameters?: LlmParameters[],
): Promise<LlmResponse> => {
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
    return OpenAI.completion.invoke(model, provider, messages, system, conversationId, parameters);
  }
  return Opla.completion.invoke(model, provider, messages, system, conversationId, parameters);
};

const models = async (provider: Provider): Promise<Model[]> => {
  if (provider.type === ProviderType.openai) {
    // TODO: implement
    return [];
  }
  return [];
};

const getCompletionParametersDefinition = (provider?: Provider): CompletionParametersDefinition => {
  if (provider?.type === ProviderType.openai) {
    return OpenAI.completion.parameters;
  }
  return Opla.completion.parameters;
};

export { completion, models, getCompletionParametersDefinition };
