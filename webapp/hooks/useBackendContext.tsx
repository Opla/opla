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
import {
  Metadata,
  Provider,
  ProviderType,
  OplaContext,
  ServerStatus,
  Download,
  Settings,
  LlmResponse,
} from '@/types';
import {
  getOplaConfig,
  getProviderTemplate,
  setActiveModel as setBackendActiveModel,
  saveSettings,
} from '@/utils/backend/commands';
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
  start: (params: any) => Promise<void>;
  stop: () => Promise<void>;
  restart: (params: any) => Promise<void>;
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
  const startRef = useRef(async (conf: unknown) => {
    throw new Error(`start not initialized ${conf}`);
  });
  const stopRef = useRef(async () => {
    throw new Error('stop not initialized');
  });
  const restartRef = useRef(async (conf: unknown) => {
    throw new Error(`restart not initialized ${conf}`);
  });

  const backendListener = (event: any) => {
    logger.info('backend event', event);
    if (event.event === 'opla-server') {
      setBackendContext((context = initialBackendContext) => {
        let { activeModel } = context.config.models;
        if (event.payload.status === ServerStatus.STARTING) {
          activeModel = event.payload.message;
        }
        return {
          ...context,
          config: {
            ...context.config,
            models: {
              ...context.config.models,
              activeModel,
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

  const streamListener = async (event: any) => {
    logger.info('stream event', event);
    const response = event.payload as LlmResponse;
    if (response.status === 'success') {
      setBackendContext((context = initialBackendContext) => {
        const { streams = {} } = context;
        const stream = streams[response.conversationId] || {};
        if (stream.prevContent !== response.content) {
          const prevContent = stream.content || '';
          streams[response.conversationId] = {
            ...response,
            content: prevContent + response.content,
            prevContent: response.content,
          };
        }
        return {
          ...context,
          streams,
        };
      });
    } else {
      setBackendContext((context = initialBackendContext) => {
        const { streams = {} } = context;

        delete streams[response.conversationId];
        return {
          ...context,
          streams,
        };
      });
    }
  };

  const startBackend = useCallback(async () => {
    let opla = providers.find((p) => p.type === ProviderType.opla) as Provider;
    if (!opla) {
      const oplaProviderConfig = await getProviderTemplate();
      const provider = { ...oplaProviderConfig, type: oplaProviderConfig.type as ProviderType };
      opla = createProvider('Opla', provider);
      providers.splice(0, 0, opla);
    }
    const backendImpl = await getBackend();
    const backendImplContext = await backendImpl.connect(
      backendListener,
      downloadListener,
      streamListener,
    );
    logger.info('connected backend impl', backendImpl);
    setBackendContext((context = initialBackendContext) => ({
      ...context,
      ...backendImplContext,
    }));
    logger.info('start backend', opla.metadata, backendImplContext.config.server.parameters);
    const metadata = opla.metadata as Metadata;
    metadata.server = backendImplContext.config.server as Metadata;
    setProviders(providers);

    startRef.current = backendImpl.start as () => Promise<never>;
    stopRef.current = backendImpl.stop as () => Promise<never>;
    restartRef.current = backendImpl.restart as () => Promise<never>;
  }, [providers, setProviders]);

  const restart = async (params: any) => restartRef.current(params);

  const start = async (params: any) => startRef.current(params);

  const stop = async () => stopRef.current();

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
