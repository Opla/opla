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

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import logger from '@/utils/logger';
import { createProvider } from '@/utils/data/providers';
import getBackend from '@/utils/backend';
import { Metadata, Provider, ProviderType, OplaContext, ServerStatus, Settings } from '@/types';
import {
  getOplaConfig,
  getProviderTemplate,
  setActiveModel as setBackendActiveModel,
  saveSettings,
} from '@/utils/backend/commands';
import { AppContext } from '@/context';
import Backend from '@/utils/backend/Backend';

const initialBackendContext: OplaContext = {
  server: {
    status: ServerStatus.IDLE,
    stout: [],
    sterr: [],
  },
  config: {
    settings: {
      startApp: false,
      welcomeSplash: false,
    },
    server: {
      name: '',
      binary: '',
      parameters: {},
    },
    models: {
      activeModel: 'None',
      items: [],
      path: '',
    },
  },
};

type Context = {
  startBackend: () => Promise<void>;
  disconnectBackend: () => Promise<void>;
  backendContext: OplaContext;
  setSettings: (settings: Settings) => Promise<void>;
  updateBackendStore: () => Promise<void>;
  start: (params: any) => Promise<unknown>;
  stop: () => Promise<unknown>;
  restart: (params: any) => Promise<unknown>;
  setActiveModel: (preset: string) => Promise<void>;
};

const BackendContext = createContext<Context>({
  startBackend: async () => {},
  disconnectBackend: async () => {},
  backendContext: initialBackendContext,
  setSettings: async () => {},
  updateBackendStore: async () => {},
  start: async () => {},
  stop: async () => {},
  restart: async () => {},
  setActiveModel: async () => {},
});

function BackendProvider({ children }: { children: React.ReactNode }) {
  const [backendContext, setBackendContext] = useState<OplaContext>();
  const { providers, setProviders } = useContext(AppContext);
  const backendRef = useRef<Backend>();

  const getBackendContext = useCallback(async () => backendContext, [backendContext]);

  const startBackend = useCallback(async () => {
    let opla = providers.find((p) => p.type === ProviderType.opla) as Provider;
    if (!opla) {
      const oplaProviderConfig = await getProviderTemplate();
      const provider = { ...oplaProviderConfig, type: oplaProviderConfig.type as ProviderType };
      opla = createProvider('Opla', provider);
      providers.splice(0, 0, opla);
    }
    const backendImpl = await getBackend();
    backendRef.current = backendImpl as Backend;
    Backend.setContext = setBackendContext as (
      callback: (context: OplaContext) => OplaContext,
    ) => void;
    Backend.getContext = getBackendContext as unknown as () => OplaContext;
    const backendImplContext = await backendImpl.connect();
    logger.info('connected backend impl', backendImpl);
    setBackendContext((context = initialBackendContext) => ({
      ...context,
      ...backendImplContext,
    }));
    logger.info('start backend', opla.metadata, backendImplContext.config.server.parameters);
    const metadata = opla.metadata as Metadata;
    metadata.server = backendImplContext.config.server as Metadata;
    setProviders(providers);
  }, [getBackendContext, providers, setProviders]);

  const restart = async (params: any): Promise<unknown> => backendRef.current?.restart?.(params); // restartRef.current(params);

  const start = async (params: any): Promise<unknown> => backendRef.current?.start?.(params); // startRef.current(params);

  const stop = async (): Promise<unknown> => backendRef.current?.stop?.();

  const setSettings = useCallback(async (settings: Settings) => {
    const store = await saveSettings(settings);
    setBackendContext((context = initialBackendContext) => ({
      ...context,
      config: store,
    }));
  }, []);

  const updateBackendStore = useCallback(async () => {
    logger.info('updateBackendStore');
    const store = await getOplaConfig();
    setBackendContext((context = initialBackendContext) => ({
      ...context,
      config: store,
    }));
  }, []);

  const setActiveModel = useCallback(
    async (model: string) => {
      logger.info('setActiveModel', model);
      await setBackendActiveModel(model);
      await updateBackendStore();
      setBackendContext((context = initialBackendContext) => {
        const newContext = {
          ...context,
          config: { ...context.config, models: { ...context.config.models, activeModel: model } },
        };
        return newContext;
      });
    },
    [updateBackendStore],
  );

  const disconnectBackend = useCallback(async () => {
    // logger.info('unmountBackendProvider');
  }, []);

  const contextValue = useMemo<Context>(
    () => ({
      startBackend,
      disconnectBackend,
      backendContext: backendContext as OplaContext,
      setSettings,
      updateBackendStore,
      start,
      stop,
      restart,
      setActiveModel,
    }),
    [
      backendContext,
      disconnectBackend,
      setActiveModel,
      setSettings,
      startBackend,
      updateBackendStore,
    ],
  );

  return <BackendContext.Provider value={contextValue}>{children}</BackendContext.Provider>;
}

export { BackendProvider };

const useBackendContext = () => {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error('useBackendContext must be used within a BackendProvider');
  }
  return context;
};

export default useBackendContext;
