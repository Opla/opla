// Copyright 2024 mik
//

import {
  AIImplService,
  CompletionParametersDefinition,
  Conversation,
  LlmMessage,
  LlmParameters,
  LlmCompletionResponse,
  Message,
  Model,
  Preset,
  Provider,
  ProviderType,
  LlmTokenizeResponse,
  ContextWindowPolicy,
} from '@/types';
import OpenAI from './openai';
import Opla from './opla';
import { findCompatiblePreset, getCompletePresetProperties } from '../data/presets';
import { getMessageContentAsString } from '../data/messages';
import { ParsedPrompt } from '../parsers';
import { CommandManager } from '../commands/types';
import { invokeTauri } from '../backend/tauri';


export const tokenize = async (activeService: AIImplService, text: string): Promise<LlmTokenizeResponse> => {
  const { provider, model } = activeService;
  let response: LlmTokenizeResponse;
  if (model && provider){
    response = await invokeTauri<LlmTokenizeResponse>('llm_call_tokenize', {
      model: model.name,
      provider: provider.name,
      text,
    });
  } else {
    throw new Error('Model or provider not found');
  }
  return response;
};

export const buildContext = (
  conversation: Conversation,
  messages: Message[],
  index: number,
  policy: ContextWindowPolicy,
  keepSystemMessages: boolean,
): LlmMessage[] => {
  const context: Message[] = [];

  if (policy === ContextWindowPolicy.Last) {
    const message = messages.findLast((m) => m.author?.role === 'system');
    if (message) {
      context.push(message);
    }
  } else {
    // For other policies, we include all messages, and handle system messages accordingly
    messages.forEach((message) => {
      if (message.author?.role !== 'system' || keepSystemMessages) {
        context.push(message);
      }
    });
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
): Promise<LlmCompletionResponse> => {
  if (!activeService.model) {
    throw new Error('Model not set');
  }
  const { model, provider } = activeService;
  const llmParameters: LlmParameters[] = [];
  const preset = findCompatiblePreset(conversation?.preset, presets, model?.name, provider);
  const { parameters: presetParameters, system, contextWindowPolicy = ContextWindowPolicy.None, keepSystem = true } = getCompletePresetProperties(
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
  const messages = buildContext(conversation, conversationMessages, index, contextWindowPolicy, keepSystem);

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

