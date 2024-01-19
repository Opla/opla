// Copyright 2023 mik
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

import { Entity, MenuItem, Model, Resource, OplaContext, Provider } from '@/types';
import Opla from '@/components/icons/Opla';

const getSelectedModel = (backendContext: OplaContext) => {
  const selectedPreset = `${backendContext.config.server.name}::${backendContext.config.models.defaultModel}`;
  return selectedPreset;
};

const getLocalModelsAsItems = (backendContext: OplaContext, modelname: string): MenuItem[] =>
  backendContext.config.models.items.map((model) => ({
    label: model.title || model.name,
    value: model.name,
    icon: Opla,
    selected: model.name === modelname,
  }));

const getProviderModelsAsItems = (providers: Provider[], modelname: string): MenuItem[] => {
  const items = providers.reduce((acc, provider) => {
    if (!provider.models || provider.disabled) return acc;
    const providerItems = provider.models.map((model) => ({
      label: model.title || model.name,
      value: model.name,
      type: provider.name === "OpenAI " ? "openai" : provider.type,
      selected: model.name === modelname,
    })) || [];
    return [...acc, ...providerItems];
  }, [] as MenuItem[]);
  return items;
};

const getDownloadables = (model: Model, downloads = [] as Array<Model>, parent?: Model) => {
  if (model?.download) {
    if (parent?.publisher && !model?.publisher) {
      downloads.push({ ...model, publisher: parent.publisher });
    } else {
      downloads.push(model);
    }
  }
  model?.include?.forEach((m) => getDownloadables(m, downloads, model));
  return downloads;
};

const getEntityName = (entity: string | Entity | undefined) =>
  ((entity as Entity)?.name || entity || '') as string;

const getResourceUrl = (resource: string | Resource | undefined) =>
  ((resource as Resource)?.url || resource || '') as string;

const isValidFormat = (m: Model) =>
  m?.library === 'GGUF' ||
  m?.name.endsWith('.gguf') ||
  getResourceUrl(m?.download).endsWith('.gguf');

const findModel = (model: string, models: Model[]): Model | undefined =>
  models.find((m) => m.name === model || m.id === model);

export {
  getDownloadables,
  getEntityName,
  getResourceUrl,
  isValidFormat,
  findModel,
  getSelectedModel,
  getLocalModelsAsItems,
  getProviderModelsAsItems,
};
