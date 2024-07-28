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

'use client';

import { createContext, useEffect, useMemo, useState } from 'react';
import { LlmUsage } from '@/types';
import { defaultPresets, mergePresets } from '@/utils/data/presets';
import logger from '@/utils/logger';
import { useAssistantStore, useModelsStore, usePresetStore, useProviderStore } from '@/stores';
import { StorageState } from '@/stores/types';

export type Context = {
  usage: LlmUsage | undefined;
  setUsage: (newUsage: LlmUsage | undefined) => void;
};

const initialContext: Context = {
  usage: undefined,
  setUsage: () => {},
};

const AppContext = createContext(initialContext);

function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<LlmUsage>();
  const { providers, loadProviders } = useProviderStore();
  const { loadAssistants } = useAssistantStore();
  const { state: modelState, loadModels } = useModelsStore();
  const { state: presetState, presets, setPresets, loadPresets } = usePresetStore();

  useEffect(() => {
    if (modelState === StorageState.INIT) {
      logger.info('init storage');
      loadProviders();
      loadAssistants();
      loadModels();
    }
  }, [modelState, providers, loadProviders, loadAssistants, loadModels]);

  useEffect(() => {
    if (presetState === StorageState.INIT) {
      if (presets.length === 0) {
        loadPresets();
      } else {
        const updatedPresets = mergePresets(presets, defaultPresets);
        setPresets(updatedPresets);
      }
    }
  }, [presetState, presets, loadPresets, setPresets]);

  const contextValue = useMemo(
    () => ({
      usage,
      setUsage,
    }),
    [usage],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export { AppContext, AppContextProvider };
