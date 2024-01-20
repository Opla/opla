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
import { Backend } from '@/utils/backend/connect';
import logger from '@/utils/logger';
import { createProvider } from '@/utils/data/providers';
import connectBackend from '@/utils/backend';
import {
  Metadata,
  Provider,
  ProviderType,
  OplaContext,
  ServerStatus,
  Download,
  Settings,
} from '@/types';
import { getOplaConfig, getProviderTemplate, saveSettings } from '@/utils/backend/commands';
import { toCamelCase } from '@/utils/string';
import { mapKeys } from '@/utils/data';
import { AppContext } from '@/context';

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
      defaultModel: 'None',
      items: [],
      path: '',
    },
  },
};

type Context = {
  startBackend: () => Promise<void>;
  backendContext: OplaContext;
  setSettings: (settings: Settings) => Promise<void>;
  updateBackendStore: () => Promise<void>;
  start: (params: any) => Promise<void>;
  stop: () => Promise<void>;
  restart: (params: any) => Promise<void>;
  setActivePreset: (preset: string) => Promise<void>;
};
const BackendContext = createContext<Context>({
  startBackend: async () => {},
  backendContext: initialBackendContext,
  setSettings: async () => {},
  updateBackendStore: async () => {},
  start: async () => {},
  stop: async () => {},
  restart: async () => {},
  setActivePreset: async () => {},
});

function BackendProvider({ children }: { children: React.ReactNode }) {
  const [backendContext, setBackendContext] = useState<OplaContext>();
  const { providers, setProviders } = useContext(AppContext);
  const startRef = useRef(async (conf: any) => {
    throw new Error(`start not initialized${conf}`);
  });
  const stopRef = useRef(async () => {
    throw new Error('stop not initialized');
  });
  const restartRef = useRef(async (conf: any) => {
    throw new Error(`restart not initialized${conf}`);
  });

  const backendListener = (event: any) => {
    logger.info('backend event', event);
    if (event.event === 'opla-server') {
      setBackendContext((context = initialBackendContext) => {
        let { defaultModel } = context.config.models;
        if (event.payload.status === ServerStatus.STARTING) {
          defaultModel = event.payload.message;
        }
        return {
          ...context,
          config: {
            ...context.config,
            models: {
              ...context.config.models,
              defaultModel,
            },
          },
          server: {
            ...context.server,
            status: event.payload.status,
            message: event.payload.message,
          },
        };
      });
    }
  };

  const downloadListener = async (event: any) => {
    // logger.info('downloader event', event);
    if (event.event === 'opla-downloader') {
      const [type, download]: [string, Download] = await mapKeys(event.payload, toCamelCase);

      // logger.info('download', type, downloads);
      if (type === 'progress') {
        setBackendContext((context = initialBackendContext) => {
          const { downloads = [] } = context;
          const index = downloads.findIndex((d) => d.id === download.id);
          if (index === -1) {
            downloads.push(download);
          } else {
            downloads[index] = download;
          }
          return {
            ...context,
            downloads,
          };
        });
      } else if (type === 'finished') {
        setBackendContext((context = initialBackendContext) => {
          const { downloads = [] } = context;
          const index = downloads.findIndex((d) => d.id === download.id);
          logger.info('download finished', index, download);
          if (index !== -1) {
            downloads.splice(index, 1);
          }
          return {
            ...context,
            downloads,
          };
        });
      }
    }
  };

  const startBackend = useCallback(async () => {
    let opla = providers.find((p) => p.type === 'opla') as Provider;
    if (!opla) {
      const oplaProviderConfig = await getProviderTemplate();
      const provider = { ...oplaProviderConfig, type: oplaProviderConfig.type as ProviderType };
      opla = createProvider('Opla', provider);
      providers.splice(0, 0, opla);
    }
    const backendImpl: Backend = await connectBackend(backendListener, downloadListener);
    logger.info('backend impl', backendImpl);
    setBackendContext((context = initialBackendContext) => ({
      ...context,
      ...backendImpl.context,
    }));
    logger.info('backend', opla.metadata, backendImpl.context.config.server.parameters);
    const metadata = opla.metadata as Metadata;
    metadata.server = backendImpl.context.config.server as Metadata;
    setProviders(providers);

    startRef.current = backendImpl.start as () => Promise<never>;
    stopRef.current = backendImpl.stop as () => Promise<never>;
    restartRef.current = backendImpl.restart as () => Promise<never>;
  }, [providers, setProviders]);

  const restart = async (params: any) => restartRef.current(params);

  const start = async (params: any) => startRef.current(params);

  const stop = async () => stopRef.current();

  const setActivePreset = async (preset: string) => {
    logger.info('setActivePreset', preset);

    setBackendContext((context = initialBackendContext) => {
      const newContext = {
        ...context,
        config: { ...context.config, models: { ...context.config.models, defaultModel: preset } },
      };
      return newContext;
    });
  };

  const setSettings = useCallback(
    async (settings: Settings) => {
      const store = await saveSettings(settings);
      setBackendContext((context = initialBackendContext) => ({ ...context, config: store }));
    },
    [setBackendContext],
  );

  const updateBackendStore = useCallback(async () => {
    logger.info('updateBackendStore');
    const store = await getOplaConfig();
    setBackendContext((context = initialBackendContext) => ({ ...context, config: store }));
  }, [setBackendContext]);

  const contextValue = useMemo(
    () => ({
      startBackend,
      backendContext: backendContext as OplaContext,
      setSettings,
      updateBackendStore,
      start,
      stop,
      restart,
      setActivePreset,
    }),
    [backendContext, setSettings, startBackend, updateBackendStore],
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
