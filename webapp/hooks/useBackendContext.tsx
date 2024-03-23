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
  Settings,
  LlmCompletionResponse,
  LlmStreamResponse,
  Download,
  ServerParameters,
} from '@/types';
import {
  getOplaConfig,
  getProviderTemplate,
  setActiveModel as setBackendActiveModel,
  saveSettings,
} from '@/utils/backend/commands';
import { AppContext } from '@/context';
import Backend, { BackendResult } from '@/utils/backend/Backend';
import { mapKeys } from '@/utils/data';
import { toCamelCase } from '@/utils/string';
import { LlamaCppArgumentsSchema } from '@/utils/providers/llama.cpp/schema';
// import { toast } from '@/components/ui/Toast';

const initialBackendContext: OplaContext = {
  server: {
    status: ServerStatus.IDLE,
    stdout: [],
    stderr: [],
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
  start: (params: ServerParameters | undefined) => Promise<BackendResult>;
  stop: () => Promise<BackendResult>;
  restart: (params: ServerParameters | undefined) => Promise<BackendResult>;
  setActiveModel: (preset: string) => Promise<void>;
};

const defaultContext: Context = {
  startBackend: async () => {},
  disconnectBackend: async () => {},
  backendContext: initialBackendContext,
  setSettings: async () => {},
  updateBackendStore: async () => {},
  start: async () => ({ status: 'error', error: 'not implemented' }),
  stop: async () => ({ status: 'error', error: 'not implemented' }),
  restart: async () => ({ status: 'error', error: 'not implemented' }),
  setActiveModel: async () => {},
};

const BackendContext = createContext<Context>(defaultContext);

function BackendProvider({ children }: { children: React.ReactNode }) {
  const [backendContext, saveBackendContext] = useState<OplaContext>();
  const backendContextRef = useRef(backendContext);
  const { providers, setProviders } = useContext(AppContext);
  const backendRef = useRef<Backend>();

  const setBackendContext = (context: OplaContext) => {
    backendContextRef.current = context;
    saveBackendContext((ctx) => ({ ...ctx, ...context }));
  };

  const backendListener = useCallback(async (event: any) => {
    logger.info('backend event', event);
    const context = backendContextRef.current;
    if (event.event === 'opla-server' && context) {
      if (event.payload.status === ServerStatus.STDOUT) {
        const { stdout = [] } = context.server;
        const len = stdout.unshift(event.payload.message);
        if (len > 50) {
          stdout.pop();
        }
        logger.info('stdout', stdout);
        setBackendContext({
          ...context,
          server: {
            ...context.server,
            stdout,
          },
        });
      } else if (event.payload.status === ServerStatus.STDERR) {
        const { stderr = [] } = context.server;
        const len = stderr.unshift(event.payload.message);
        if (len > 50) {
          stderr.pop();
        }
        logger.error('stderr', stderr);
        setBackendContext({
          ...context,
          server: {
            ...context.server,
            stderr,
          },
        });
      } else {
        let { activeModel } = context.config.models;
        if (event.payload.status === ServerStatus.STARTING) {
          activeModel = event.payload.message;
        }
        setBackendContext({
          ...context,
          config: {
            ...context?.config,
            models: {
              ...context?.config.models,
              activeModel,
            },
          },
          server: {
            ...context?.server,
            status: event.payload.status,
            message: event.payload.message,
          },
        });
      }
    }
  }, []);

  const downloadListener = useCallback(
    async (event: any) => {
      // logger.info('downloader event', event);
      const context = backendContextRef.current;
      if (event.event === 'opla-downloader') {
        const [type, download]: [string, Download] = await mapKeys(event.payload, toCamelCase);

        // logger.info('download', type, downloads);
        if (type === 'progress') {
          const { downloads = [] } = backendContext || {};
          const index = downloads.findIndex((d) => d.id === download.id);
          if (index === -1) {
            downloads.push(download);
          } else {
            downloads[index] = download;
          }
          setBackendContext({
            ...context,
            downloads,
          } as OplaContext);
        } else if (type === 'finished' || type === 'canceled') {
          const { downloads = [] } = backendContext || {};
          const index = downloads.findIndex((d) => d.id === download.id);
          logger.info(`download ${type}`, index, download);
          if (index !== -1) {
            downloads.splice(index, 1);
          }
          setBackendContext({
            ...context,
            downloads,
          } as OplaContext);
        }
      }
    },
    [backendContext],
  );

  const streamListener = useCallback(
    async (event: any) => {
      const context = backendContextRef.current;
      if (!context) {
        return;
      }
      logger.info('stream event', event, backendContext, context);
      const response = (await mapKeys(event.payload, toCamelCase)) as LlmCompletionResponse;
      if (response.status === 'error') {
        logger.error('stream error', response);
        return;
      }
      if (!response.conversationId) {
        logger.error('stream event without conversationId', response);
        return;
      }
      const { conversationId } = response;

      const { streams = {} } = context || {};
      if (response.status === 'success') {
        const stream = streams[conversationId] || ({} as LlmStreamResponse);
        if (stream.prevContent !== response.content) {
          const content = stream.content || [];
          content.push(response.content);
          streams[conversationId] = {
            ...response,
            content,
            prevContent: response.content,
          } as LlmStreamResponse;
          setBackendContext({
            ...context,
            streams,
          } as OplaContext);
        }
        return;
      }
      if (response.status === 'finished' && streams[conversationId]) {
        delete streams[conversationId];
        setBackendContext({
          ...context,
          streams,
        } as OplaContext);
      }
    },
    [backendContext],
  );

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
    // Backend.getContext = getBackendContext as unknown as () => Promise<Readonly<OplaContext>>;
    const listeners = {
      'opla-server': backendListener,
      'opla-downloader': downloadListener,
      'opla-sse': streamListener,
    };
    const backendImplContext = await backendImpl.connect(listeners);
    logger.info('connected backend impl', backendImpl);
    setBackendContext({
      ...initialBackendContext,
      ...backendImplContext,
    });
    logger.info('start backend', opla.metadata, backendImplContext.config.server.parameters);
    const metadata = opla.metadata as Metadata;
    metadata.server = backendImplContext.config.server as Metadata;
    setProviders(providers);
  }, [backendListener, downloadListener, providers, setProviders, streamListener]);

  const restart = useCallback(
    async (params: ServerParameters | undefined = {}): Promise<BackendResult> => {
      const llmParameters = LlamaCppArgumentsSchema.parse(params);
      let result: BackendResult;
      try {
        result = await (backendRef.current?.restart?.(llmParameters) ||
          defaultContext.restart(params));
        if (result.status === 'error') {
          setBackendContext({
            ...backendContext,
            server: {
              ...backendContext?.server,
              status: ServerStatus.ERROR,
              message: result.error,
            },
          } as OplaContext);
        }
      } catch (error: any) {
        // logger.error('trstart error', error);
        // toast.error(error.toString());
        result = { status: 'error', error: error.toString() };
      }
      return result;
    },
    [backendContext],
  );

  const start = useCallback(
    async (params: ServerParameters | undefined = {}): Promise<BackendResult> => {
      const llmParameters = LlamaCppArgumentsSchema.parse(params);
      let result: BackendResult;
      try {
        result = await (backendRef.current?.start?.(llmParameters) || defaultContext.start(params));
        if (result.status === 'error') {
          setBackendContext({
            ...backendContext,
            server: {
              ...backendContext?.server,
              status: ServerStatus.ERROR,
              message: result.error,
            },
          } as OplaContext);
        }
      } catch (error: any) {
        // logger.error('trstart error', error);
        // toast.error(error.toString());
        result = { status: 'error', error: error.toString() };
      }
      return result;
    },
    [backendContext],
  );

  const stop = useCallback(async (): Promise<BackendResult> => {
    const result = await (backendRef.current?.stop?.() || defaultContext.stop());
    if (result.status === 'error') {
      setBackendContext({
        ...backendContext,
        server: {
          ...backendContext?.server,
          status: ServerStatus.ERROR,
          message: result.error,
        },
      } as OplaContext);
    }
    return result;
  }, [backendContext]);

  const setSettings = useCallback(
    async (settings: Settings) => {
      const store = await saveSettings(settings);
      setBackendContext({
        ...backendContext,
        config: store,
      } as OplaContext);
    },
    [backendContext],
  );

  const updateBackendStore = useCallback(async () => {
    logger.info('updateBackendStore');
    const store = await getOplaConfig();
    setBackendContext({
      ...backendContext,
      config: store,
    } as OplaContext);
  }, [backendContext]);

  const setActiveModel = useCallback(
    async (model: string) => {
      logger.info('setActiveModel', model);
      await setBackendActiveModel(model);
      await updateBackendStore();
      setBackendContext({
        ...backendContext,
        config: {
          ...backendContext?.config,
          models: { ...backendContext?.config.models, activeModel: model },
        },
      } as OplaContext);
    },
    [backendContext, updateBackendStore],
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
      restart,
      setActiveModel,
      setSettings,
      start,
      startBackend,
      stop,
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
