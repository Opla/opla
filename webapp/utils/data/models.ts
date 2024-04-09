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

import { BrainCircuit } from 'lucide-react';
import { Ui, Model, OplaContext, Provider, ProviderType, ModelState } from '@/types';
import Opla from '@/components/icons/Opla';
import OpenAI from '@/components/icons/OpenAI';
import { deepMerge, getEntityName, getResourceUrl } from '.';
import { getLocalProvider, getProviderState } from './providers';
import OplaProvider from '../providers/opla';
import logger from '../logger';
import { installModel } from '../backend/commands';

export const getLocalModels = (backendContext: OplaContext, full = false) =>
  full
    ? backendContext.config.models.items
    : backendContext.config.models.items.filter((model) => model.state !== ModelState.Removed);

export const getProviderModels = (providers: Provider[]) => {
  const providerModels = providers.reduce((acc, provider) => {
    if (!provider.models || provider.disabled) return acc;
    return [...acc, ...provider.models.map((model) => ({ ...model, provider: provider.name }))];
  }, [] as Model[]);
  return providerModels;
};

export const getAllModels = (
  providers: Provider[],
  backendContext: OplaContext,
  full?: boolean,
) => {
  const localModels = getLocalModels(backendContext, full);
  const providerModels = getProviderModels(providers);
  return [...localModels, ...providerModels];
};

export const getDownloadables = (model: Model, downloads = [] as Array<Model>, parent?: Model) => {
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

export const isValidFormat = (m: Model) =>
  m?.library === 'GGUF' ||
  m?.name.endsWith('.gguf') ||
  getResourceUrl(m?.download).endsWith('.gguf');

export const findModel = (modelIdOrName: string | undefined, models: Model[]): Model | undefined =>
  models.find(
    (m) => m.name.toLowerCase() === modelIdOrName?.toLowerCase() || m.id === modelIdOrName,
  );

export const findModelInAll = (
  modelIdOrName: string | undefined,
  providers: Provider[],
  backendContext: OplaContext,
) => {
  const allModels = getAllModels(providers, backendContext);
  return findModel(modelIdOrName, allModels);
};

export const getFirstModel = (
  providerId: string,
  providers: Provider[],
  backendContext: OplaContext,
) => {
  const provider = providers.find((p) => p.id === providerId);
  if (provider?.models && provider.models.length > 0) return provider.models[0];
  if (provider?.type === ProviderType.opla) {
    return getLocalModels(backendContext)[0];
  }
  return undefined;
};

export const isEquivalentModel = (model: Model, other: Model) => {
  const download = getResourceUrl(model.download);
  const otherDownload = getResourceUrl(other.download);

  return (
    model.baseModel === other.baseModel &&
    model.name === other.name &&
    model.version === other.version &&
    download === otherDownload
  );
};
export const findSameModel = (
  model: Model,
  backendContext: OplaContext,
  providers?: Provider[],
) => {
  const models = providers
    ? getAllModels(providers, backendContext, true)
    : getLocalModels(backendContext, true);
  return models.find((m) => isEquivalentModel(model, m));
};

export const installModelFromApi = async (modelSource: Model) => {
  const downloadables = getDownloadables(modelSource).filter(
    (d) => d.private !== true && isValidFormat(d),
  );
  let model: Model = modelSource;
  if (!isValidFormat(model) && downloadables.length > 0) {
    model = downloadables.find((d) => d.recommended) || downloadables[0];
  }

  if (!isValidFormat(model)) {
    throw new Error(`Not valid Model to install ${model?.name}`);
  }

  const selectedModel: Model = deepMerge(modelSource, model || {}, true);
  logger.info(`install ${model?.name}`, selectedModel);
  if (selectedModel.private === true) {
    delete selectedModel.private;
  }
  if (selectedModel.include) {
    delete selectedModel.include;
  }
  const path = getEntityName(selectedModel.creator || selectedModel.author);
  const id = await installModel(
    selectedModel,
    getResourceUrl(selectedModel.download),
    path,
    selectedModel.name,
  );
  return id;
};

export const getLocalModelsAsItems = (
  backendContext: OplaContext,
  selectedModelname?: string,
  localProvider?: Provider,
): Ui.MenuItem[] => {
  const state = getProviderState(localProvider);
  return getLocalModels(backendContext).map(
    (model) =>
      ({
        key: model.id,
        label: model.title || model.name,
        value: model.name,
        group: localProvider?.name || OplaProvider.name,
        icon: Opla,
        selected: model.name === selectedModelname,
        state,
      }) as Ui.MenuItem,
  );
};

export const getProviderModelsAsItems = (
  providers: Provider[],
  selectedModelname?: string,
): Ui.MenuItem[] => {
  const items = providers.reduce((acc, provider) => {
    const selectedModel = provider.models?.find((model) => model.name === selectedModelname);
    if (!provider.models || (provider.disabled && !selectedModel)) return acc;
    const state = getProviderState(provider);
    const providerItems =
      provider.models.map(
        (model) =>
          ({
            key: model.id,
            label: model.title || model.name,
            value: model.name,
            group: provider.name,
            selected: model.name === selectedModelname,
            icon: provider.type === ProviderType.openai ? OpenAI : BrainCircuit,
            state,
          }) as Ui.MenuItem,
      ) || [];
    return [...acc, ...providerItems];
  }, [] as Ui.MenuItem[]);
  return items;
};

export const getModelsAsItems = (
  providers: Provider[],
  backendContext: OplaContext,
  selectedModelname?: string,
) => {
  const localProvider = getLocalProvider(providers);
  const localItems = getLocalModelsAsItems(backendContext, selectedModelname, localProvider);
  const providerItems = getProviderModelsAsItems(providers, selectedModelname);
  return [...localItems, ...providerItems];
};
