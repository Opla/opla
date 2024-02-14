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

import { Provider, ProviderType, ServerStatus } from '@/types';
import { BasicState } from '@/types/ui';
import { createBaseNamedRecord, updateRecord } from '.';

export const getProviderState = (
  provider: Provider | undefined,
  serverStatus?: ServerStatus,
): BasicState => {
  if (serverStatus && provider?.type === ProviderType.opla) {
    if (serverStatus === ServerStatus.ERROR) return BasicState.error;
    if (serverStatus !== ServerStatus.STARTED) return BasicState.disabled;
  }
  if (provider && !provider.disabled) return BasicState.active;
  return BasicState.disabled;
};

export const getLocalProviders = (providers: Provider[]) =>
  providers.find((p) => p.type === ProviderType.opla);

const findProvider = (providerIdOrName: string | undefined, providers: Provider[]) =>
  providers.find((p) => p.id === providerIdOrName || p.name === providerIdOrName);

const createProvider = (name: string, template: Partial<Provider>) => {
  const provider: Provider = {
    ...template,
    ...createBaseNamedRecord(name),
  } as Provider;
  return provider;
};

const updateProvider = (provider: Provider, providers: Provider[]) => {
  const i = providers.findIndex((p) => p.id === provider.id);
  const updatedProvider = updateRecord(provider) as Provider;
  if (i === -1) {
    providers.push(updatedProvider);
    return providers;
  }
  return providers.map((p) => (p.id === provider.id ? updatedProvider : p));
};

const deleteProvider = (providerId: string, providers: Provider[]) =>
  providers.filter((p) => p.id !== providerId);

export { findProvider, createProvider, updateProvider, deleteProvider };
