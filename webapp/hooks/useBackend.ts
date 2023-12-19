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
import oplaProviderConfig from '@/utils/providers/opla/config.json';
import { createProvider } from '@/utils/data/providers';
import connectBackend from '@/utils/backend';
import { Metadata, Provider, ProviderType, OplaContext, ServerStatus } from '@/types';

const initialBackendContext: OplaContext = {
  server: {
    status: ServerStatus.INIT,
    stout: [],
    sterr: [],
  },
  config: {
    settings: {},
    server: {
      name: '',
      binary: '',
      parameters: {},
    },
    models: {
      defaultModel: 'None',
      models: [],
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
        setBackendContext({
          ...backendContext,
          server: {
            ...backendContext.server,
            status: event.payload.status,
            message: event.payload.message,
          },
        });
      }
    },
    [backendContext, setBackendContext],
  );

  const startBackend = useCallback(async () => {
    let opla = providers.find((p) => p.type === 'opla') as Provider;
    if (!opla) {
      const provider = { ...oplaProviderConfig, type: oplaProviderConfig.type as ProviderType };
      opla = createProvider('Opla', provider);
      providers.splice(0, 0, opla);
    }
    const backendImpl: Backend = await connectBackend(backendListener);
    logger.info('backend impl', backendImpl);
    setBackendContext({
      ...backendContext,
      ...backendImpl.context,
    });
    logger.info('backend', opla.metadata, backendImpl.context.config.server.parameters);
    const metadata = opla.metadata as Metadata;
    metadata.server = backendImpl.context.config.server as Metadata;
    setProviders(providers);

    startRef.current = backendImpl.start as () => Promise<never>;
    stopRef.current = backendImpl.stop as () => Promise<never>;
    restartRef.current = backendImpl.restart as () => Promise<never>;
  }, [backendContext, backendListener, providers, setProviders]);

  useEffect(() => {
    if (firstRender.current && providers) {
      firstRender.current = false;
      startBackend();
    }
  }, [providers, startBackend]);

  const restart = async (params: any) => restartRef.current(params);

  const start = async (params: any) => startRef.current(params);

  const stop = async () => stopRef.current();

  return { backendContext, start, stop, restart };
};

export default useBackend;
