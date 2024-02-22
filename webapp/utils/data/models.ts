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
import { Ui, Model, OplaContext, Provider, ProviderType } from '@/types';
import Opla from '@/components/icons/Opla';
import OpenAI from '@/components/icons/OpenAI';
import { getResourceUrl } from '.';
import { getLocalProvider, getProviderState } from './providers';

export const getSelectedModel = (backendContext: OplaContext) => {
  const selectedPreset = `${backendContext.config.server.name}::${backendContext.config.models.activeModel}`;
  return selectedPreset;
};

export const getLocalModelsAsItems = (
  backendContext: OplaContext,
  modelname?: string,
  localProvider?: Provider,
): Ui.MenuItem[] => {
  const state = getProviderState(localProvider);
  return backendContext.config.models.items.map((model) => ({
    label: model.title || model.name,
    value: model.name,
    group: localProvider?.name || ProviderType.opla,
    icon: Opla,
    selected: model.name === modelname,
    state,
  }));
};

export const getProviderModelsAsItems = (
  providers: Provider[],
  modelname?: string,
): Ui.MenuItem[] => {
  const items = providers.reduce((acc, provider) => {
    if (!provider.models || provider.disabled) return acc;
    const state = getProviderState(provider);
    const providerItems =
      provider.models.map(
        (model) =>
          ({
            label: model.title || model.name,
            value: model.name,
            group: provider.name,
            selected: model.name === modelname,
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
  modelname?: string,
) => {
  const localProvider = getLocalProvider(providers);
  const localItems = getLocalModelsAsItems(backendContext, modelname, localProvider);
  const providerItems = getProviderModelsAsItems(providers, modelname);
  return [...localItems, ...providerItems];
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

export const findModel = (model: string, models: Model[]): Model | undefined =>
  models.find((m) => m.name === model || m.id === model);
