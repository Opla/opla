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
import { Preset } from '@/types';
import { deepEqual, mapKeys } from '@/utils/data';
import { toSnakeCase } from '@/utils/string';
import { Emitter, GlobalAppState, StateEvent, StorageProps, StorageState } from './types';

interface PresetProps extends StorageProps {
  presets: Preset[];
}

export interface PresetSlice extends PresetProps {
  isLoading: () => boolean;
  loadPresets: (force?: boolean) => void;
  setPresets: (updatedPresets: Preset[]) => void;
}

export type PresetStore = ReturnType<typeof createPresetSlice>;

const DEFAULT_PROPS: PresetProps = {
  state: StorageState.INIT,
  presets: [],
};

const createPresetSlice =
  (emit: Emitter, initProps?: Partial<PresetSlice>): StateCreator<PresetSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    isLoading: () => get().state === StorageState.INIT || get().state === StorageState.LOADING,
    loadPresets: (force = false) => {
      if (get().state === StorageState.INIT || force) {
        set({ ...get(), state: StorageState.LOADING });
        emit(StateEvent.PRESET, GlobalAppState.PRESETS);
      }
    },
    setPresets: (updatedPresets: Preset[]) => {
      if (!deepEqual(get().presets, updatedPresets)) {
        set({ presets: updatedPresets });
        const value = mapKeys({ presets: updatedPresets }, toSnakeCase);
        emit(StateEvent.PRESET, GlobalAppState.PRESETS, value);
      }
    },
  });

export default createPresetSlice;
