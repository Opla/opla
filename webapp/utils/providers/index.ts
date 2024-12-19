// Copyright 2024 Mik Bry
//

import {
  AIImplService,
  CompletionParameterDefinitions,
  Conversation,
  LlmMessage,
  LlmMessageRole,
  LlmParameters,
  Message,
  Preset,
  Provider,
  ProviderType,
  LlmTokenizeResponse,
  ContextWindowPolicy,
  ImplProvider,
  LlmQueryCompletion,
  LlmImageGenerationResponse,
  LlmModelsResponse,
} from '@/types';
import OpenAI from './openai';
import Opla from './opla';
import { findCompatiblePreset, getCompletePresetProperties } from '../data/presets';
import { getMessageContentAsString } from '../data/messages';
import { ParsedPrompt } from '../parsers';
import { CommandManager } from '../commands/types';
import { invokeTauri } from '../backend/tauri';
import { mapKeys } from '../data';
import { /* toCamelCase, */ toCamelCase, toSnakeCase } from '../string';
import logger from '../logger';

export const tokenize = async (
  activeService: AIImplService,
  text: string,
): Promise<LlmTokenizeResponse | undefined> => {
  const { provider, model } = activeService;
  let response: LlmTokenizeResponse | undefined;
  if (model && provider) {
    try {
      response = await invokeTauri<LlmTokenizeResponse>('llm_call_tokenize', {
        model: model.name,
        provider: mapKeys(provider, toSnakeCase),
        text,
      });
    } catch (e) {
      logger.error('tokenizer: ', e);
    }
  }
  return response;
};

export const createLlmMessages = (
  modelName: string,
  providerName: string | undefined,
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
      const content = getMessageContentAsString(message);
      if ((message.author?.role !== 'system' || keepSystemMessages) && content !== '...') {
        context.push(message);
      }
    });
  }

  const sanitizedName = providerName === 'OpenAI' ? undefined : modelName;

  const llmMessages: LlmMessage[] = context
    .filter((m) => m.author.role !== 'note')
    .map((m) => ({
      content: getMessageContentAsString(m),
      role: m.author?.role as LlmMessageRole,
      name: m.author?.role !== 'assistant' ? m.author?.name : sanitizedName,
    }));
  return llmMessages;
};

export const tokenize = async (
  activeService: AIImplService,
  text: string,
): Promise<LlmTokenizeResponse | undefined> => {
  const { provider, model } = activeService;
  let response: LlmTokenizeResponse;
  if (model && provider) {
    response = await invokeTauri<LlmTokenizeResponse>('llm_call_tokenize', {
      model: model.name,
      provider: mapKeys(provider, toSnakeCase),
      text,
    });
  } else {
    return undefined;
  }
  return response;
};

export const tokenizeMessages = async (
  activeService: AIImplService,
  conversationMessages: Message[],
  conversation: Conversation,
  presets: Preset[],
): Promise<LlmTokenizeResponse | undefined> => {
  const { provider, model } = activeService;
  let response: LlmTokenizeResponse;
  if (model && provider) {
    const preset = findCompatiblePreset(conversation?.preset, presets, model?.name, provider);
    const { parameters: presetParameters, ...completionOptions } = getCompletePresetProperties(
      preset,
      conversation,
      presets,
    );
    const { contextWindowPolicy = ContextWindowPolicy.None, keepSystem = true } = completionOptions;
    const messages = createLlmMessages(
      model.name,
      provider?.name,
      conversationMessages,
      contextWindowPolicy,
      keepSystem,
    );
    response = await invokeTauri<LlmTokenizeResponse>('llm_call_tokenize_messages', {
      model: model.name,
      provider: mapKeys(provider, toSnakeCase),
      messages: mapKeys(messages, toSnakeCase),
      completionOptions: mapKeys(completionOptions, toSnakeCase),
    });
  } else {
    return undefined;
  }
  return response;
};

export const getCompletionParametersDefinition = (
  provider?: Provider,
): CompletionParameterDefinitions => {
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
): Promise<void> => {
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
    provider?.name,
    conversationMessages,
    contextWindowPolicy,
    keepSystem,
  );

  const options: LlmQueryCompletion = mapKeys(
    {
      messages, // : [systemMessage, ...messages],
      conversationId: conversation.id,
      messageId: message.id,
      parameters: llmParameters,
    },
    toSnakeCase,
  );

  const llmProvider = mapKeys({ ...provider, key }, toSnakeCase);
  /* const response: LlmCompletionResponse = */ await invokeTauri('llm_call_completion', {
    model: model.id,
    llmProvider,
    query: { command: 'completion', options },
    completionOptions: mapKeys(completionOptions, toSnakeCase),
  });

  /* if (response.status === 'error') {
    throw new Error(response.message);
  }

  const { content } = response;
  if (content) {
    logger.info(`${implProvider.name} completion response`, response);
    return mapKeys(response, toCamelCase);
  }
  throw new Error(`${implProvider.name} completion error ${response}`); */
};

export const cancelCompletion = async (
  activeService: AIImplService,
  conversationId: string,
  messageId: string,
): Promise<void> => {
  const { provider } = activeService;
  if (provider) {
    await invokeTauri<LlmTokenizeResponse>('llm_cancel_completion', {
      provider: mapKeys(provider, toSnakeCase),
      conversationId,
      messageId,
    });
  }
};

export const imageGeneration = async (
  _provider: Provider,
  prompt: string,
  modelId?: string | undefined,
): Promise<LlmImageGenerationResponse> => {
  const provider = mapKeys({ ..._provider }, toSnakeCase);
  const response: LlmImageGenerationResponse = await invokeTauri('llm_call_image_generation', {
    model: modelId || 'dall-e-3',
    provider,
    prompt,
  });
  return response;
};

export const listModels = async (_provider: Provider): Promise<LlmModelsResponse> => {
  const provider = mapKeys({ ..._provider }, toSnakeCase);
  const response: LlmModelsResponse = await invokeTauri('llm_call_models', {
    provider,
  });
  return mapKeys(response, toCamelCase);
};
