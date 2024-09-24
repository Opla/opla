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
import { ServerConfiguration } from '@/types';
import { deepEqual, mapKeys } from '@/utils/data';
import { toSnakeCase } from '@/utils/string';
import { Emitter, GlobalAppState, StateEvent, StorageProps, StorageState } from './types';

interface ServerProps extends StorageProps {
  serverConfig: ServerConfiguration;
}

export interface ServerSlice extends ServerProps {
  isLoading: () => boolean;
  loadServerConfig: (force?: boolean) => void;
  setServerConfig: (updatedConfig: ServerConfiguration) => void;
}

export type ServerStore = ReturnType<typeof createServerSlice>;

const DEFAULT_PROPS: ServerProps = {
  state: StorageState.INIT,
  serverConfig: {
    name: '',
    parameters: {},
  },
};

const createServerSlice =
  (emit: Emitter, initProps?: Partial<ServerSlice>): StateCreator<ServerSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    isLoading: () => get().state === StorageState.INIT || get().state === StorageState.LOADING,
    loadServerConfig: (force = false) => {
      if (get().state === StorageState.INIT || force) {
        set({ ...get(), state: StorageState.LOADING });
        emit(StateEvent.SERVER, GlobalAppState.SERVER);
      }
    },
    setServerConfig: (server: ServerConfiguration) => {
      if (!deepEqual(get().serverConfig, server)) {
        set({ serverConfig: server });
        const value = mapKeys({ server }, toSnakeCase);
        emit(StateEvent.SERVER, GlobalAppState.SERVER, value);
      }
    },
  });

export default createServerSlice;
