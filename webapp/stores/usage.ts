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
import { LlmUsage } from '@/types';
import { Emitter, StorageProps, StorageState } from './types';

type UsageProps = StorageProps & {
  usage?: LlmUsage;
};

export interface UsageSlice extends UsageProps {
  setUsage: (updatedUsage: LlmUsage | undefined) => void;
}

export type SettingsStore = ReturnType<typeof createUsageSlice>;

const DEFAULT_PROPS: UsageProps = {
  state: StorageState.INIT,
};

const createUsageSlice =
  (emit: Emitter, initProps?: Partial<UsageSlice>): StateCreator<UsageSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    setUsage: (updatedUsage: LlmUsage | undefined) => {
      set({ ...get(), state: StorageState.OK, usage: updatedUsage });
    },
  });

export default createUsageSlice;
