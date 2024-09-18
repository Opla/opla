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
import { AIService, AIServiceType } from '@/types';
import { setActiveModel as setBackendActiveModel } from '@/utils/backend/commands';
import logger from '@/utils/logger';
import { Emitter, GlobalAppState, StorageProps, StorageState } from './types';
import { deepEqual } from '@/utils/data';

interface ServiceProps extends StorageProps {
  activeService?: AIService;
}

export interface ServiceSlice extends ServiceProps {
  isLoading: () => boolean;
  loadServices: (force?: boolean) => void;
  setActiveModel: (modelName: string, provider?: string) => Promise<void>;
  getActiveModel: () => string | undefined;
  setActiveService: (service: AIService) => void;
}

export type ServiceStore = ReturnType<typeof createServiceSlice>;

const DEFAULT_PROPS: ServiceProps = {
  state: StorageState.INIT,
};

const createServiceSlice =
  (emit: Emitter, initProps?: Partial<ServiceSlice>): StateCreator<ServiceSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    isLoading: () => get().state === StorageState.INIT || get().state === StorageState.LOADING,
    loadServices: (force = false) => {
      if (get().state === StorageState.INIT || force) {
        set({ ...get(), state: StorageState.LOADING });
        emit(GlobalAppState.SERVICES);
      }
    },
    setActiveService: (activeService: AIService) => {
      const storage = get();
      if (!deepEqual(storage.activeService, activeService) || storage.state !== StorageState.OK || storage.error !== undefined) {
        set({ activeService, state: StorageState.OK, error: undefined });
        emit(GlobalAppState.SERVICES, { services: { activeService } });
      }

    },
    getActiveModel: () => {
      const { activeService } = get();
      return activeService?.type === AIServiceType.Model ? activeService.modelId : undefined;
    },
    setActiveModel: async (model: string, provider?: string) => {
      logger.info('setActiveModel', model);
      await setBackendActiveModel(model, provider);
      let { activeService } = get();
      if (activeService?.type === AIServiceType.Model && activeService.modelId === model) {
        return;
      }
      activeService = {
        type: AIServiceType.Model,
        modelId: model,
        providerIdOrName: provider,
      };
      const storage = get();
      if (!deepEqual(storage.activeService, activeService) || storage.state !== StorageState.OK || storage.error !== undefined) {
        set({ activeService, state: StorageState.OK, error: undefined });
        emit(GlobalAppState.SERVICES, { services: { activeService } });
      }
    },
  });

export default createServiceSlice;
