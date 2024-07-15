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

import { Ui, Model, Provider, ProviderType, ModelState, ModelsConfiguration } from '@/types';
import { deepMerge, getEntityName, getResourceUrl } from '.';
import { getLocalProvider, getProviderState } from './providers';
import OplaProvider from '../providers/opla';
import logger from '../logger';
import { installModel } from '../backend/commands';

export const getLocalModels = (models: ModelsConfiguration, full = false) =>
  full ? models.items : models.items.filter((model) => model.state !== ModelState.Removed);

export const getProviderModels = (providers: Provider[]) => {
  const providerModels = providers.reduce((acc, provider) => {
    if (!provider.models || provider.disabled) return acc;
    return [...acc, ...provider.models.map((model) => ({ ...model, provider: provider.name }))];
  }, [] as Model[]);
  return providerModels;
};

export const getAllModels = (
  providers: Provider[],
  models: ModelsConfiguration,
  full?: boolean,
) => {
  const localModels = getLocalModels(models, full);
  const providerModels = getProviderModels(providers);
  return [...localModels, ...providerModels];
};

export const getAnyFirstModel = (providers: Provider[], models: ModelsConfiguration) => {
  const localModels = getLocalModels(models);
  if (localModels.length > 0) {
    return localModels[0];
  }
  const providerModels = getProviderModels(providers);
  if (providerModels.length > 0) {
    return providerModels[0];
  }
  return undefined;
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
  models: ModelsConfiguration,
  full?: boolean,
) => {
  const allModels = getAllModels(providers, models, full);
  return findModel(modelIdOrName, allModels);
};

export const getFirstModel = (
  providerId: string,
  providers: Provider[],
  models: ModelsConfiguration,
) => {
  const provider = providers.find((p) => p.id === providerId);
  if (provider?.models && provider.models.length > 0) return provider.models[0];
  if (provider?.type === ProviderType.opla) {
    return getLocalModels(models)[0];
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
  modelsConfig: ModelsConfiguration,
  providers?: Provider[],
) => {
  const models = providers
    ? getAllModels(providers, modelsConfig, true)
    : getLocalModels(modelsConfig, true);
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
  models: ModelsConfiguration,
  selectedModelname?: string,
  localProvider?: Provider,
): Ui.MenuItem[] => {
  const state = getProviderState(localProvider);
  return getLocalModels(models).map(
    (model) =>
      ({
        key: model.id,
        label: model.title || model.name,
        value: model.name,
        group: localProvider?.name || OplaProvider.name,
        icon: model.icon, // BrainCircuit,
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
            icon: model.icon, // provider.type === ProviderType.openai ? OpenAI : BrainCircuit,
            state,
          }) as Ui.MenuItem,
      ) || [];
    return [...acc, ...providerItems];
  }, [] as Ui.MenuItem[]);
  return items;
};

export const getModelsAsItems = (
  providers: Provider[],
  models: ModelsConfiguration,
  selectedModelname?: string,
) => {
  const localProvider = getLocalProvider(providers);
  const localItems = getLocalModelsAsItems(models, selectedModelname, localProvider);
  const providerItems = getProviderModelsAsItems(providers, selectedModelname);
  return [...localItems, ...providerItems];
};

export const getModelStateAsString = (model: Model | undefined) => {
  let state = 'Not found';
  if (model) {
    if (model.state === ModelState.Ok) {
      state = 'Completed';
    } else if (model.state === ModelState.Pending) {
      state = 'Please wait...';
    } else if (model.state === ModelState.Error) {
      state = 'Error';
    } else if (model.state === ModelState.Downloading) {
      state = 'Downloading';
    } else {
      state = 'Not found';
    }
  }

  return state;
};
