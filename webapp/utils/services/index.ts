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
import { findProvider } from '../data/providers';

export const activeServiceFrom = (service: AIService): AIImplService => ({
  ...service,
  model: undefined,
  provider: undefined,
});

export const getActiveService = (
  conversation: Conversation,
  assistant: Assistant | undefined,
  providers: Provider[],
  activeModel: string,
  backendContext: OplaContext,
  _modelName: string | undefined,
): AIImplService => {
  const type = assistant ? AIServiceType.Assistant : AIServiceType.Model;
  const activeService: AIService | undefined = getConversationService(
    conversation,
    type,
    assistant?.id,
  );

  let model: Model | undefined;
  let providerName: string | undefined = model?.provider;
  let provider: Provider | undefined;

  if (activeService && activeService.type === AIServiceType.Model) {
    provider = findProvider(activeService.providerType, providers);
    model = findModel(activeService.modelId, provider?.models || []);
    if (provider) {
      providerName = provider.name;
    }
  }
  const modelName = _modelName || model?.name || conversation.model || activeModel;
  if (!model || model.name !== modelName) {
    model = findModelInAll(modelName, providers, backendContext);
  }
  const name = model?.provider || model?.creator;
  if (name && name !== providerName) {
    provider = findProvider(name, providers);
  }

  return { ...activeService, model, provider } as AIImplService;
};
