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

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '@/context';
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

const initialBackendContext: OplaContext = {
  server: {
    status: ServerStatus.INIT,
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

const useBackend = () => {
  const [backendContext, setBackendContext] = useState(initialBackendContext);
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

  const firstRender = useRef(true);

  const backendListener = useCallback(
    (event: any) => {
      logger.info('backend event', event);
      if (event.event === 'opla-server') {
        setBackendContext((context) => ({
          ...context,
          server: {
            ...context.server,
            status: event.payload.status,
            message: event.payload.message,
          },
        }));
      }
    },
    [setBackendContext],
  );

  const downloadListener = useCallback(
    async (event: any) => {
      // logger.info('downloader event', event);
      if (event.event === 'opla-downloader') {
        const [type, download]: [string, Download] = await mapKeys(event.payload, toCamelCase);

        // logger.info('download', type, downloads);
        if (type === 'progress') {
          setBackendContext((context) => {
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
          setBackendContext((context) => {
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
    },
    [setBackendContext],
  );

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
    setBackendContext((context) => ({
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
  }, [backendListener, downloadListener, providers, setProviders]);

  useEffect(() => {
    if (firstRender.current && providers) {
      firstRender.current = false;
      startBackend();
    }
  }, [providers, startBackend]);

  const restart = async (params: any) => restartRef.current(params);

  const start = async (params: any) => startRef.current(params);

  const stop = async () => stopRef.current();

  const setActivePreset = async (preset: string) => {
    logger.info('setActivePreset', preset);

    setBackendContext((context) => {
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
      setBackendContext((context) => ({ ...context, config: store }));
    },
    [setBackendContext],
  );

  const updateBackendStore = useCallback(async () => {
    logger.info('updateBackendStore');
    const store = await getOplaConfig();
    setBackendContext((context) => ({ ...context, config: store }));
  }, [setBackendContext]);

  const getBackendContext = () => backendContext;

  return {
    getBackendContext,
    setSettings,
    updateBackendStore,
    start,
    stop,
    restart,
    setActivePreset,
  };
};

export default useBackend;
