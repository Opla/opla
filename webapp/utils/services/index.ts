// Copyright 2024 mik
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
  Conversation,
  AIService,
  AIServiceType,
  AIImplService,
  Model,
  Provider,
  OplaContext,
  Assistant,
} from '../../types';

import { getConversationService } from '../data/conversations';
import { findModel, findModelInAll } from '../data/models';
import { findProvider, getLocalProvider } from '../data/providers';
import OplaProvider from '../providers/opla';

export const activeServiceFrom = (service: AIService): AIImplService => ({
  ...service,
  model: undefined,
  provider: undefined,
});

export const getActiveService = (
  conversation: Conversation | undefined,
  assistant: Assistant | undefined,
  providers: Provider[],
  backendContext: OplaContext,
  _modelName: string,
): AIImplService => {
  const type = assistant ? AIServiceType.Assistant : AIServiceType.Model;
  let activeService: AIService | undefined = conversation
    ? getConversationService(conversation, type, assistant?.id)
    : backendContext.config.services.activeService;
  let modelName = _modelName; // || backendContext.config.models.activeModel;

  let model: Model | undefined;
  let provider: Provider | undefined;
  let providerIdOrName = conversation?.provider;
  if (!activeService) {
    if (assistant) {
      activeService = activeServiceFrom({
        type: AIServiceType.Assistant,
        assistantId: assistant.id,
        targetId: assistant.targets?.[0]?.id,
      });
    } else {
      activeService = activeServiceFrom({
        type: AIServiceType.Model,
        modelId: modelName,
        providerIdOrName,
      });
    }
  }
  if (activeService.type === AIServiceType.Model) {
    ({ providerIdOrName } = activeService);
    modelName = _modelName || activeService.modelId;
    provider = findProvider(providerIdOrName, providers);
    model = findModel(modelName, provider?.models || []);
    if (!model && modelName) {
      model = findModelInAll(modelName, providers, backendContext);
    }
    if (!provider) {
      providerIdOrName = model?.provider || OplaProvider.name;
      provider = findProvider(providerIdOrName, providers);
      activeService.providerIdOrName = providerIdOrName;
    }
  } else if (activeService.type === AIServiceType.Assistant) {
    const { assistantId, targetId } = activeService;
    if (assistantId && targetId) {
      const target = assistant?.targets?.find((t) => t.id === targetId);

      if (target?.models && target.models.length > 0) {
        modelName = target.models?.[0];
        providerIdOrName = target.provider;
      }
    } else if (assistant && conversation?.services?.length === 2) {
      const modelService = conversation.services.find(
        (s) => s.type === AIServiceType.Model && s.providerIdOrName,
      );
      if (modelService?.type === AIServiceType.Model) {
        providerIdOrName = modelService.providerIdOrName;
      }
    }

    model = findModelInAll(modelName, providers, backendContext);
    provider = findProvider(model?.provider || providerIdOrName, providers);
    if (provider?.models?.find((m) => m.id === model?.id) === undefined) {
      provider = undefined;
    }
  }
  if (!provider) {
    provider = getLocalProvider(providers);
  }
  return { ...activeService, model, provider } as AIImplService;
};

export const getAssistantId = (conversation: Conversation | undefined): string | undefined => {
  let assistantId: string | undefined;
  if (conversation?.services) {
    const service = conversation.services.find((c) => c.type === AIServiceType.Assistant);
    if (service?.type === AIServiceType.Assistant) assistantId = service?.assistantId;
  }
  return assistantId;
};
