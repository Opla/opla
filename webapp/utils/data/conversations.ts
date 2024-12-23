// Copyright 2023 Mik Bry
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  ContextWindowPolicy,
  Conversation,
  AIService,
  AIServiceType,
  Assistant,
  Model,
} from '@/types';
import { createBaseNamedRecord, deepCopy, deepEqual, updateRecord } from '.';
import { createFileAssets, getAssetsAsArray } from './assets';

export const getDefaultConversationName = (t = (value: string) => value) => t('Conversation');

export const getConversationAssets = (conversation: Conversation) =>
  getAssetsAsArray(conversation.assets);

export const addAssetsToConversation = async (
  conversation: Conversation,
  assetsAsFile: string | string[],
) => {
  const conversationAssets = getConversationAssets(conversation) || [];
  const assets = await createFileAssets(assetsAsFile, conversationAssets);
  return {
    conversation: deepCopy<Conversation>({
      ...conversation,
      assets: [...conversationAssets, ...assets],
    }),
    assets,
  };
};

const compareConversations = (conversationA: Conversation, conversationB: Conversation) => {
  const { updatedAt: uA, ...cA } = conversationA;
  const { updatedAt: uB, ...cB } = conversationB;
  return deepEqual(cA, cB);
};
export const createConversation = (name: string) => {
  const conversation: Conversation = {
    ...createBaseNamedRecord(name),
    messages: [],
    contextWindowPolicy: ContextWindowPolicy.Rolling,
    keepSystem: true,
  };
  return conversation;
};

export const getConversation = (
  conversationId: string | undefined,
  conversations: Conversation[],
) => deepCopy(conversations.find((c) => c.id === conversationId));

export const updateConversation = (
  conversation: Conversation,
  conversations: Conversation[],
  noUpdate = false,
) => {
  const previousConversation = conversations.find((c) => c.id === conversation.id);
  if (!previousConversation) {
    return conversations;
  }
  if (noUpdate || !compareConversations(previousConversation, conversation)) {
    return conversations.map((c) => (c.id === conversation.id ? conversation : c));
  }
  const updatedConversation = updateRecord(conversation) as Conversation;
  return conversations.map((c) => (c.id === updatedConversation.id ? updatedConversation : c));
};

export const removeConversation = (conversationId: string, conversations: Conversation[]) =>
  conversations.filter((c) => c.id !== conversationId);

export const updateOrCreateConversation = (
  conversationId: string | undefined,
  conversations: Conversation[],
  partial: Partial<Conversation>,
  conversationName: string,
) => {
  let conversation = conversations.find((c) => c.id === conversationId);
  let updatedConversations;
  const defaultName = getDefaultConversationName();
  let name = conversation?.name || partial.name;
  name = name === defaultName ? conversationName : partial.name || defaultName;
  name = name.trim().substring(0, 200);
  if (conversation) {
    updatedConversations = updateConversation({ ...conversation, ...partial, name }, conversations);
  } else {
    conversation = createConversation(name);
    updatedConversations = [...conversations, conversation];
  }
  return updatedConversations;
};

export const mergeConversations = (
  conversations: Conversation[],
  newConversations: Conversation[],
) => {
  const mergedConversations = [...conversations, ...newConversations];

  const conversationMap = new Map<string, Conversation>();
  mergedConversations.forEach((c) => {
    const existingConversation = conversationMap.get(c.id);
    if (
      !existingConversation ||
      (c.updatedAt >= existingConversation.updatedAt &&
        !compareConversations(c, existingConversation))
    ) {
      conversationMap.set(c.id, c);
    }
  });
  return Array.from(conversationMap.values());
};

export const deepEqualConversations = (
  conversationsA: Conversation[],
  conversationsB: Conversation[],
) => {
  if (conversationsA.length === conversationsB.length) {
    return conversationsA.every((conversation, index) => {
      const conversationB = conversationsB[index];
      return (
        conversation.id === conversationB.id &&
        deepEqual(conversation.currentPrompt, conversationB.currentPrompt) &&
        deepEqual(conversation.importedFrom, conversationB.importedFrom) &&
        deepEqual(conversation.temp, conversationB.temp) &&
        deepEqual(conversation.usage, conversationB.usage) &&
        deepEqual(conversation.assets, conversationB.assets) &&
        deepEqual(conversation.preset, conversationB.preset) &&
        deepEqual(conversation.model, conversationB.model) &&
        deepEqual(conversation.services, conversationB.services)
      );
    });
  }
  return false;
};

export const getConversationService = (
  conversation: Conversation,
  serviceType: AIServiceType,
  assistantId?: string,
) => {
  let service = conversation.services?.find((c) => c.type === serviceType);
  if (!service) {
    if (conversation.model && serviceType === AIServiceType.Model) {
      service = {
        type: serviceType,
        modelId: conversation.model,
        providerIdOrName: conversation.provider,
      };
    }
    if (conversation.model && serviceType === AIServiceType.Assistant && assistantId) {
      service = {
        type: serviceType,
        assistantId,
      };
    }
  } else {
    service = deepCopy(service);
  }
  return service;
};

export const getConversationAssistant = (conversation: Conversation) => {
  let assistantId;
  const service = conversation.services?.find((c) => c.type === AIServiceType.Assistant);
  if (service?.type === AIServiceType.Assistant) {
    ({ assistantId } = service);
  }
  return assistantId;
};

export const removeConversationService = (
  conversation: Conversation,
  serviceType: AIServiceType,
): Conversation => {
  const services = conversation.services?.filter((s) => s.type !== serviceType);
  return { ...conversation, services };
};
export const addService = (_services: AIService[] | undefined, service: AIService): AIService[] => {
  const services = _services || [];
  const index = services?.findIndex((c) => c.type === service.type) ?? -1;
  if (index !== -1) {
    services[index] = service;
  } else {
    services.push(service);
  }
  return services;
};

export const addConversationService = (
  conversation: Conversation,
  service: AIService,
): Conversation => {
  const index = conversation.services?.findIndex((c) => c.type === service.type) ?? -1;
  const services = conversation.services || [];
  if (index !== -1) {
    services[index] = service;
  } else {
    services.push(service);
  }
  return {
    ...conversation,
    services,
  };
};

export const getServiceModelId = (modelService: AIService | undefined) => {
  if (modelService && modelService.type === AIServiceType.Model) {
    return modelService.modelId;
  }
  return undefined;
};

export const getServiceProvider = (modelService: AIService | undefined) => {
  if (modelService && modelService.type === AIServiceType.Model) {
    return modelService.providerIdOrName;
  }
  return undefined;
};

export const getConversationModelId = (
  conversation: Conversation | undefined,
  assistant?: Assistant,
) => {
  if (!conversation) {
    return undefined;
  }
  const modelService = getConversationService(conversation, AIServiceType.Model);
  let modelId = getServiceModelId(modelService);
  if (!modelId) {
    const assistantService = getConversationService(conversation, AIServiceType.Assistant);
    if (assistantService?.type === AIServiceType.Assistant) {
      const { assistantId, targetId } = assistantService;
      if (assistantId && assistantId === assistant?.id) {
        const target = assistant.targets?.find((t) => t.id === targetId);
        modelId = target?.models?.[0];
      }
    }
  }
  return modelId;
};

export const getConversationProvider = (conversation: Conversation | undefined) => {
  if (!conversation) {
    return undefined;
  }
  const modelService = getConversationService(conversation, AIServiceType.Model);
  return getServiceProvider(modelService);
};

export const isModelUsedInConversations = (conversations: Conversation[], model: Model) =>
  conversations.some((c) => {
    const modelNameId = getConversationModelId(c);
    return modelNameId === model.id || modelNameId === model.name;
  });
