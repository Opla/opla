// Copyright 2024 mik
//

import {
  CompletionParametersDefinition,
  Conversation,
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

// TODO: code it in Rust
// and use ContextWindowPolicy from webapp/utils/constants.ts
const buildContext = (conversation: Conversation, index: number): LlmMessage[] => {
  const context: Message[] = [];
  // Only ContextWindowPolicy.Last is implemented
  if (index > 0) {
    context.push(conversation.messages[index - 1]);
  }

  const messages: LlmMessage[] = context.map((m) => ({
    content: getContent(m.content),
    role: m.author?.role === 'user' ? 'user' : 'assistant',
    name: m.author?.name,
  }));
  return messages;
};

const completion = async (
  model: Model | undefined,
  providerName: string | undefined,
  context: { providers: Provider[] },
  messages: LlmMessage[],
  system?: string,
  conversationId?: string,
  parameters?: LlmParameters[],
): Promise<LlmResponse> => {
  if (!model) {
    throw new Error('Model not set');
  }
  const providerIdOrName = providerName || model?.provider;
  const provider = findProvider(providerIdOrName, context.providers);
  /* const messages: LlmMessage[] = threadMessages.map((m) => ({
    content: getContent(m.content),
    role: m.author?.role === 'user' ? 'user' : 'assistant',
    name: m.author?.name,
  })); */
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

export { buildContext, completion, models, getCompletionParametersDefinition };
