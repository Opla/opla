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
import { Settings } from '@/types';
import { deepEqual, mapKeys } from '@/utils/data';
import { toSnakeCase } from '@/utils/string';
import { Emitter, GlobalAppState, StorageProps, StorageState } from './types';

interface SettingsProps extends StorageProps {
  settings: Settings;
}

export interface SettingsSlice extends SettingsProps {
  isLoading: () => boolean;
  loadSettings: (force?: boolean) => void;
  setSettings: (updatedSettings: Settings) => void;
}

export type SettingsStore = ReturnType<typeof createSettingsSlice>;

const DEFAULT_PROPS: SettingsProps = {
  state: StorageState.INIT,
  settings: {
    startApp: false,
    welcomeSplash: false,
  },
};

const createSettingsSlice =
  (emit: Emitter, initProps?: Partial<SettingsSlice>): StateCreator<SettingsSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    isLoading: () => get().state === StorageState.INIT || get().state === StorageState.LOADING,
    loadSettings: (force = false) => {
      if (get().state === StorageState.INIT || force) {
        set({ ...get(), state: StorageState.LOADING });
        emit(GlobalAppState.SETTINGS);
      }
    },
    setSettings: (updatedSettings: Settings) => {
      if (!deepEqual(get().settings, updatedSettings)) {
        set({ settings: updatedSettings });
        const value = mapKeys({ settings: updatedSettings }, toSnakeCase);
        emit(GlobalAppState.SETTINGS, value);
      }
    },
  });

export default createSettingsSlice;
