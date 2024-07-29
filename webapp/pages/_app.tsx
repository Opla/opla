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

import { useEffect, useRef, useState } from 'react';
import { AppProps } from 'next/app';
import Layout from '@/components/Layout';
import { ThemeProvider } from 'next-themes';
import { ModalsProvider } from '@/modals/context';
import { BackendProvider } from '@/hooks/useBackendContext';
import {
  subscribeStateSync,
  /* useAssistantStore,
  useModelsStore,
  usePresetStore,
  useProviderStore,
  useSettingsStore,
  useThreadStore, */
} from '@/stores';
import logger from '@/utils/logger';

export default function App({ Component }: AppProps) {
  /* const modelStore = useModelsStore();
  const providerStore = useProviderStore();
  const assistantStore = useAssistantStore();
  const threadStore = useThreadStore();
  const presetStore = usePresetStore();
  const settingsStore = useSettingsStore(); */

  // Dirty hack to fix hydration mismatch using i18n
  const [initialRenderComplete, setInitialRenderComplete] = useState<boolean>(false);

  const stateSync = useRef<{ unsubscribe?: () => void; processing: boolean }>({
    processing: false,
  });
  useEffect(() => {
    setInitialRenderComplete(true);
    const subscribe = async () => {
      logger.info('subscribeStateSync prev', stateSync);
      if (stateSync.current.processing) {
        return;
      }
      const func = stateSync.current.unsubscribe;
      stateSync.current = { processing: true };
      func?.();
      stateSync.current.unsubscribe = await subscribeStateSync();
      logger.info('subscribeStateSync post', stateSync);
      /* settingsStore.loadSettings();
      threadStore.loadAllConversations();
      providerStore.loadProviders();
      assistantStore.loadAssistants();
      modelStore.loadModels();
      presetStore.loadPresets(); */
      stateSync.current.processing = false;
    };
    subscribe();

    const listener = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', listener, false);

    return () => {
      window.removeEventListener('contextmenu', listener);
      logger.info('unSubscribeStateSync', stateSync);
      stateSync.current.unsubscribe?.();
      stateSync.current.unsubscribe = undefined;
    };
  }, []);

  /* useEffect(() => {
    if (stateSync.current.processing || !stateSync.current.unsubscribe) {
      return;
    }
    logger.info('load Storages', stateSync);
    settingsStore.loadSettings();
    threadStore.loadAllConversations();
    providerStore.loadProviders();
    assistantStore.loadAssistants();
    modelStore.loadModels();
    presetStore.loadPresets();
  }, [
    assistantStore.loadAssistants,
    modelStore.loadModels,
    presetStore.loadPresets,
    providerStore.loadProviders,
    settingsStore.loadSettings,
    threadStore.loadAllConversations,
  ]); */

  /* useEffect(() => {
    if (unsubscribe && modelStore.state === StorageState.INIT) {
      logger.info('init model storage');
      modelStore.loadModels();
    }
  }, [unsubscribe, modelStore.state, modelStore.loadModels]);

  useEffect(() => {
    if (unsubscribe && threadStore.state === StorageState.INIT) {
      logger.info('init thread storage');
      settingsStore.loadSettings();
      threadStore.loadAllConversations();
      providerStore.loadProviders();
      assistantStore.loadAssistants();
      modelStore.loadModels();
    }
  }, [unsubscribe, modelStore.state, providerStore.loadProviders, assistantStore.loadAssistants, modelStore.loadModels]); */

  /* useEffect(() => {
    if (unsubscribe && presetStore.state === StorageState.INIT) {
      logger.info('init presets');
      if (presetStore.presets.length === 0) {
        presetStore.loadPresets();
      } else {
        const updatedPresets = mergePresets(presetStore.presets, defaultPresets);
        presetStore.setPresets(updatedPresets);
      }
    }
  }, [unsubscribe, presetStore]); */

  if (!initialRenderComplete) return <div />;
  // End of dirty hack...

  return (
    <ThemeProvider attribute="class">
      <BackendProvider>
        <ModalsProvider>
          <Layout>
            <Component />
          </Layout>
        </ModalsProvider>
      </BackendProvider>
    </ThemeProvider>
  );
}
