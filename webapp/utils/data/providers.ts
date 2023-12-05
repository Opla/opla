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

import { Provider } from '@/types';
import { createBaseNamedRecord, updateRecord } from '.';

const createProvider = (name: string, template: Partial<Provider>) => {
  const provider: Provider = {
    ...template,
    ...createBaseNamedRecord(name),
  } as Provider;
  return provider;
};

const updateProvider = (provider: Provider, providers: Provider[]) => {
  const i = providers.findIndex((p) => p.id === provider.id);
  if (i === -1) {
    return providers;
  }
  const updatedProvider = updateRecord(provider) as Provider;

  return providers.map((p) => (p.id === provider.id ? updatedProvider : p));
};

export { createProvider, updateProvider };
