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
  ImplProvider,
  LlmQueryCompletion,
} from '@/types';
import OpenAI from './openai';
import Opla from './opla';
import { findCompatiblePreset, getCompletePresetProperties } from '../data/presets';
import { getMessageContentAsString } from '../data/messages';
import { ParsedPrompt } from '../parsers';
import { CommandManager } from '../commands/types';
import { invokeTauri } from '../backend/tauri';
import { mapKeys } from '../data';
import { toCamelCase, toSnakeCase } from '../string';
import logger from '../logger';

export const tokenize = async (
  activeService: AIImplService,
  text: string,
): Promise<LlmTokenizeResponse> => {
  const { provider, model } = activeService;
  let response: LlmTokenizeResponse;
  if (model && provider) {
    response = await invokeTauri<LlmTokenizeResponse>('llm_call_tokenize', {
      model: model.name,
      provider: mapKeys(provider, toSnakeCase),
      text,
    });
  } else {
    throw new Error('Model or provider not found');
  }
  return response;
};

export const createLlmMessages = (
  modelName: string,
  messages: Message[],
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
    role: m.author?.role,
    name: m.author?.role !== 'assistant' ? m.author?.name : modelName,
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
  const { parameters: presetParameters, ...completionOptions } = getCompletePresetProperties(
    preset,
    conversation,
    presets,
  );

  let implProvider: ImplProvider;
  if (provider?.type === ProviderType.opla) {
    implProvider = Opla;
  } else {
    implProvider = OpenAI;
  }

  const { contextWindowPolicy = ContextWindowPolicy.None, keepSystem = true } = completionOptions;
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
  if (
    implProvider.completion.parameters.stream.defaultValue &&
    !llmParameters.find((p) => p.key === 'stream')
  ) {
    llmParameters.push({
      key: 'stream',
      value: String(implProvider.completion.parameters.stream.defaultValue),
    });
  }

  // const index = conversationMessages.findIndex((m) => m.id === message.id);
  const messages = createLlmMessages(
    model.name,
    conversationMessages,
    contextWindowPolicy,
    keepSystem,
  );

  const options: LlmQueryCompletion = mapKeys(
    {
      messages, // : [systemMessage, ...messages],
      conversationId: conversation.id,
      parameters: llmParameters,
    },
    toSnakeCase,
  );

  const llmProvider = mapKeys({ ...provider, key }, toSnakeCase);
  const response: LlmCompletionResponse = (await invokeTauri('llm_call_completion', {
    model: model.name,
    llmProvider,
    query: { command: 'completion', options },
    completionOptions: mapKeys(completionOptions, toSnakeCase),
  })) as LlmCompletionResponse;

  if (response.status === 'error') {
    throw new Error(response.message);
  }

  const { content } = response;
  if (content) {
    logger.info(`${implProvider.name} completion response`, response);
    return mapKeys(response, toCamelCase);
  }
  throw new Error(`${implProvider.name} completion error ${response}`);
};

export const models = async (provider: Provider): Promise<Model[]> => {
  if (provider.type === ProviderType.openai) {
    // TODO: implement
    return [];
  }
  return [];
};
