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

interface ServiceProps extends StorageProps {
  activeService?: AIService;
}

export interface ServiceSlice extends ServiceProps {
  loadServices: () => void;
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
    loadServices: () => {
      emit(GlobalAppState.SERVICES, undefined);
    },
    setActiveService: (activeService: AIService) => {
      set({ activeService, state: StorageState.OK, error: undefined });
      emit(GlobalAppState.SERVICES, { services: { activeService }});
    },
    getActiveModel: () => {
      const { activeService } = get();
      return activeService?.type === AIServiceType.Model ? activeService.modelId : undefined;
    },
    setActiveModel: async (model: string, provider?: string) => {
      logger.info('setActiveModel', model);
      await setBackendActiveModel(model, provider);
      // await updateBackendStore();
      let { activeService } = get();
      if (activeService?.type === AIServiceType.Model && activeService.modelId === model) {
        return;
      }
      activeService = {
        type: AIServiceType.Model,
        modelId: model,
        providerIdOrName: provider,
      };
      set({ activeService, state: StorageState.OK, error: undefined });
      emit(GlobalAppState.SERVICES, { services: { activeService }});
    },
  });

export default createServiceSlice;
