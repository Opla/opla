// Copyright 2024 mik
//

import {
  AIImplService,
  CompletionParametersDefinition,
  Conversation,
  LlmMessage,
  LlmParameters,
  LlmResponse,
  Message,
  Model,
  Preset,
  Provider,
  ProviderType,
} from '@/types';
import OpenAI from './openai';
import Opla from './opla';
import { findCompatiblePreset, getCompletePresetProperties } from '../data/presets';
import { getMessageContentAsString } from '../data/messages';
import { ParsedPrompt } from '../parsers';
import { CommandManager } from '../commands/types';

// TODO: code it in Rust
// and use ContextWindowPolicy from webapp/utils/constants.ts
export const buildContext = (
  conversation: Conversation,
  messages: Message[],
  index: number,
): LlmMessage[] => {
  const context: Message[] = [];
  // Only ContextWindowPolicy.Last is implemented
  if (index > 0) {
    context.push(messages[index - 1]);
  }

  const llmMessages: LlmMessage[] = context.map((m) => ({
    content: getMessageContentAsString(m),
    role: m.author?.role === 'user' ? 'user' : 'assistant',
    name: m.author?.name,
  }));
  return llmMessages;
};

export const getCompletionParametersDefinition = (
  provider?: Provider,
): CompletionParametersDefinition => {
  if (provider?.type === ProviderType.openai) {
    return OpenAI.completion.parameters;
  }
  return Opla.completion.parameters;
};

export const completion = async (
  activeService: AIImplService,
  message: Message,
  conversationMessages: Message[],
  conversation: Conversation,
  presets: Preset[],
  prompt: ParsedPrompt,
  commandManager: CommandManager,
): Promise<LlmResponse> => {
  if (!activeService.model) {
    throw new Error('Model not set');
  }
  const { model, provider } = activeService;
  const llmParameters: LlmParameters[] = [];
  const preset = findCompatiblePreset(conversation?.preset, presets, model?.name, provider);
  const { parameters: presetParameters, system } = getCompletePresetProperties(
    preset,
    conversation,
    presets,
  );
  const commandParameters = commandManager.findCommandParameters(prompt);
  const parameters = { ...presetParameters, ...commandParameters };
  let { key } = provider || {};
  if (parameters.provider_key) {
    key = parameters.provider_key as string;
    delete parameters.provider_key;
  }
  if (parameters) {
    const parametersDefinition = getCompletionParametersDefinition(provider);
    Object.keys(parameters).forEach((k) => {
      const parameterDef = parametersDefinition[k];
      if (parameterDef) {
        const result = parameterDef.z.safeParse(parameters[k]);
        if (result.success) {
          llmParameters.push({ key: k, value: String(result.data) });
        }
      }
    });
  }
  const index = conversationMessages.findIndex((m) => m.id === message.id);
  const messages = buildContext(conversation, conversationMessages, index);

  if (provider?.type === ProviderType.openai) {
    return OpenAI.completion.invoke(
      model,
      { ...provider, key },
      messages,
      system,
      conversation.id,
      llmParameters,
    );
  }
  return Opla.completion.invoke(model, provider, messages, system, conversation.id, llmParameters);
};

export const models = async (provider: Provider): Promise<Model[]> => {
  if (provider.type === ProviderType.openai) {
    // TODO: implement
    return [];
  }
  return [];
};
