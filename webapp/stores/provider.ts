// Copyright 2024 Mik Bry
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

import { StateCreator } from 'zustand';
import { Provider } from '@/types';
import { deepEqual, mapKeys } from '@/utils/data';
import { toSnakeCase } from '@/utils/string';
import { Emitter, GlobalAppState, StateEvent, StorageProps, StorageState } from './types';

interface ProviderProps extends StorageProps {
  providers: Provider[];
}

export interface ProviderSlice extends ProviderProps {
  isLoading: () => boolean;
  loadProviders: (force?: boolean) => void;
  setProviders: (updatedProviders: Provider[]) => void;
}

export type ProviderStore = ReturnType<typeof createProviderSlice>;

const DEFAULT_PROPS: ProviderProps = {
  state: StorageState.INIT,
  providers: [],
};

const createProviderSlice =
  (emit: Emitter, initProps?: Partial<ProviderSlice>): StateCreator<ProviderSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    isLoading: () => get().state === StorageState.INIT || get().state === StorageState.LOADING,
    loadProviders: (force = false) => {
      if (get().state === StorageState.INIT || force) {
        set({ ...get(), state: StorageState.LOADING });
        emit(StateEvent.PROVIDER, GlobalAppState.PROVIDERS);
      }
    },
    setProviders: (updatedProviders: Provider[]) => {
      if (!deepEqual(get().providers, updatedProviders)) {
        set({ providers: updatedProviders });
        const value = mapKeys({ providers: updatedProviders }, toSnakeCase);
        emit(StateEvent.PROVIDER, GlobalAppState.PROVIDERS, value);
      }
    },
  });
export default createProviderSlice;
