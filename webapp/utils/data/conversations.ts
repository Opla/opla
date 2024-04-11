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
  Asset,
  ContextWindowPolicy,
  Conversation,
  AIService,
  AIServiceType,
  Assistant,
  Model,
} from '@/types';
import { createBaseRecord, createBaseNamedRecord, updateRecord } from '.';

export const getDefaultConversationName = (t = (value: string) => value) => t('Conversation');

export const getConversationAssets = (conversation: Conversation) =>
  !conversation.assets || Array.isArray(conversation.assets)
    ? conversation.assets || []
    : [conversation.assets];

export const addAssetsToConversation = (
  conversation: Conversation,
  assetsAsFile: string | string[],
) => {
  const conversationAssets = getConversationAssets(conversation);
  const updatedAssets = Array.isArray(assetsAsFile)
    ? assetsAsFile.filter(
        (a) => !conversationAssets.find((asset) => asset.type === 'file' && asset.file === a),
      )
    : [assetsAsFile];
  const assets = updatedAssets.map<Asset>((a) => ({
    ...createBaseRecord<Asset>(),
    type: 'file',
    file: a,
  }));

  return {
    conversation: {
      ...conversation,
      assets: [...conversationAssets, ...assets],
    } as Conversation,
    conversationAssets,
    assets,
  };
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
) => conversations.find((c) => c.id === conversationId);

export const updateConversation = (
  conversation: Conversation,
  conversations: Conversation[],
  noUpdate = false,
) => {
  const i = conversations.findIndex((c) => c.id === conversation.id);
  if (i === -1) {
    return conversations;
  }
  if (noUpdate) {
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
) => {
  let conversation = conversations.find((c) => c.id === conversationId);
  let updatedConversations;
  if (conversation) {
    updatedConversations = updateConversation({ ...conversation, ...partial }, conversations);
  } else {
    const name = partial.name || getDefaultConversationName();
    conversation = createConversation(name.trim().substring(0, 200));
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
    if (!existingConversation || c.updatedAt >= existingConversation.updatedAt) {
      conversationMap.set(c.id, c);
    }
  });
  return Array.from(conversationMap.values());
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
  }
  return service;
};

export const removeConversationService = ( conversation: Conversation, serviceType: AIServiceType) => {
  conversation.services = conversation.services?.filter((s) => s.type !== serviceType);
  return conversation;
}
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
