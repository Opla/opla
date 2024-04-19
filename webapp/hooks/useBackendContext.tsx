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
  AIServiceType,
  Streams,
  Store,
  OplaServer,
} from '@/types';
import {
  getOplaConfig,
  getProviderTemplate,
  setActiveModel as setBackendActiveModel,
  saveSettings,
} from '@/utils/backend/commands';
import { AppContext } from '@/context';
import Backend, { BackendResult } from '@/utils/backend/Backend';
import { deepCopy, mapKeys } from '@/utils/data';
import { toCamelCase } from '@/utils/string';
import { LlamaCppArgumentsSchema } from '@/utils/providers/llama.cpp/schema';
import OplaProvider from '@/utils/providers/opla';

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
      items: [],
      path: '',
    },
    services: {},
  },
};

type Context = OplaContext & {
  startBackend: () => Promise<void>;
  disconnectBackend: () => Promise<void>;
  setSettings: (settings: Settings) => Promise<void>;
  updateBackendStore: () => Promise<void>;
  start: (params: ServerParameters | undefined) => Promise<BackendResult>;
  stop: () => Promise<BackendResult>;
  restart: (params: ServerParameters | undefined) => Promise<BackendResult>;
  setActiveModel: (modelName: string, provider?: string) => Promise<void>;
  getActiveModel: () => string | undefined;
};

const defaultContext: Context = {
  server: initialBackendContext.server,
  config: initialBackendContext.config,
  startBackend: async () => {},
  disconnectBackend: async () => {},
  setSettings: async () => {},
  updateBackendStore: async () => {},
  start: async () => ({ status: 'error', error: 'not implemented' }),
  stop: async () => ({ status: 'error', error: 'not implemented' }),
  restart: async () => ({ status: 'error', error: 'not implemented' }),
  setActiveModel: async () => {},
  getActiveModel: () => undefined,
};

const BackendContext = createContext<Context>(defaultContext);

function BackendProvider({ children }: { children: React.ReactNode }) {
  const [server, saveServer] = useState<OplaServer>(defaultContext.server);
  const serverRef = useRef<OplaServer>(server);

  const [config, saveConfig] = useState<Store>(defaultContext.config);
  const configRef = useRef<Store>(config);

  const [downloads, saveDownloads] = useState<Download[]>();
  const downloadsRef = useRef<Download[] | undefined>(downloads);
  const [streams, saveStreams] = useState<Streams>();
  const streamsRef = useRef<Streams | undefined>(streams);

  const { providers, setProviders } = useContext(AppContext);
  const backendRef = useRef<Backend>();

  const updateServer = (partials: Partial<OplaServer>) => {
    const updatedServer: OplaServer = { ...serverRef.current, ...partials } as OplaServer;
    serverRef.current = updatedServer;
    saveServer(updatedServer);
  };

  const updateConfig = (partials: Partial<Store>) => {
    const updatedConfig: Store = { ...configRef.current, ...partials } as Store;
    configRef.current = updatedConfig;
    saveConfig(updatedConfig);
  };

  const updateDownloads = (updatedDownloads: Download[]) => {
    downloadsRef.current = updatedDownloads;
    saveDownloads(updatedDownloads);
  };

  const updateStreams = (updatedStreams: Streams) => {
    streamsRef.current = updatedStreams;
    saveStreams(updatedStreams);
  };

  const backendListener = useCallback(async (event: any) => {
    logger.info('backend event', event);
    if (event.event === 'opla-server' && serverRef.current) {
      if (event.payload.status === ServerStatus.STDOUT) {
        const stdout = deepCopy(serverRef.current.stdout || []);
        const len = stdout.unshift(event.payload.message);
        if (len > 50) {
          stdout.pop();
        }
        logger.info('stdout', stdout);
        updateServer({
          stdout,
        });
      } else if (event.payload.status === ServerStatus.STDERR) {
        const stderr = deepCopy(serverRef.current.stderr || []);
        const len = stderr.unshift(event.payload.message);
        if (len > 50) {
          stderr.pop();
        }
        logger.error('stderr', stderr);
        updateServer({
          stderr,
        });
      } else if (configRef.current) {
        const { services } = configRef.current; // context.config;
        if (
          event.payload.status === ServerStatus.STARTING &&
          services.activeService?.type !== AIServiceType.Assistant
        ) {
          services.activeService = {
            type: AIServiceType.Model,
            modelId: event.payload.message,
          };
        }
        updateConfig({ services });
        updateServer({
          status: event.payload.status,
          message: event.payload.message,
        });
      }
    }
  }, []);

  const downloadListener = useCallback(async (event: any) => {
    if (event.event === 'opla-downloader') {
      const [type, download]: [string, Download] = await mapKeys(event.payload, toCamelCase);

      if (type === 'progress') {
        const currentDownloads = deepCopy(downloadsRef.current || []);
        const index = currentDownloads.findIndex((d) => d.id === download.id);
        if (index === -1) {
          currentDownloads.push(download);
        } else {
          currentDownloads[index] = download;
        }
        updateDownloads(currentDownloads);
      } else if (type === 'finished' || type === 'canceled') {
        const currentDownloads = downloadsRef.current || [];
        const index = currentDownloads.findIndex((d) => d.id === download.id);
        logger.info(`download ${type}`, index, download);
        if (index !== -1) {
          currentDownloads.splice(index, 1);
          updateDownloads(currentDownloads);
        }
      }
    }
  }, []);

  const streamListener = useCallback(async (event: any) => {
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

    const currentStreams: Streams = deepCopy(streamsRef.current || {});
    if (response.status === 'success') {
      const stream = currentStreams[conversationId] || ({} as LlmStreamResponse);
      if (stream.prevContent !== response.content) {
        const content = stream.content || [];
        content.push(response.content);
        currentStreams[conversationId] = {
          ...response,
          content,
          prevContent: response.content,
        } as LlmStreamResponse;
        /* setBackendContext({
            ...context,
            streams,
          } as OplaContext); */
        updateStreams(currentStreams);
      }
      return;
    }
    if (response.status === 'finished' && currentStreams[conversationId]) {
      delete currentStreams[conversationId];
      updateStreams(currentStreams);
    }
  }, []);

  const startBackend = useCallback(async () => {
    let opla = providers.find((p) => p.type === ProviderType.opla) as Provider;
    if (!opla) {
      const oplaProviderConfig = await getProviderTemplate();
      const provider = { ...oplaProviderConfig, type: oplaProviderConfig.type as ProviderType };
      opla = createProvider(OplaProvider.name, provider);
      providers.splice(0, 0, opla);
    }
    const backendImpl = await getBackend();
    backendRef.current = backendImpl as Backend;
    const listeners = {
      'opla-server': backendListener,
      'opla-downloader': downloadListener,
      'opla-sse': streamListener,
    };
    const backendImplContext: OplaContext = await backendImpl.connect(listeners);
    logger.info('connected backend impl', backendImpl);
    updateServer(backendImplContext.server);
    updateConfig(backendImplContext.config);

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
          updateServer({
            status: ServerStatus.ERROR,
            message: result.error,
          });
        }
      } catch (error: any) {
        result = { status: 'error', error: error.toString() };
      }
      return result;
    },
    [],
  );

  const start = useCallback(
    async (params: ServerParameters | undefined = {}): Promise<BackendResult> => {
      const llmParameters = LlamaCppArgumentsSchema.parse(params);
      let result: BackendResult;
      try {
        result = await (backendRef.current?.start?.(llmParameters) || defaultContext.start(params));
        if (result.status === 'error') {
          updateServer({
            status: ServerStatus.ERROR,
            message: result.error,
          });
        }
      } catch (error: any) {
        result = { status: 'error', error: error.toString() };
      }
      return result;
    },
    [],
  );

  const stop = useCallback(async (): Promise<BackendResult> => {
    const result = await (backendRef.current?.stop?.() || defaultContext.stop());
    if (result.status === 'error') {
      updateServer({
        status: ServerStatus.ERROR,
        message: result.error,
      });
    }
    return result;
  }, []);

  const setSettings = useCallback(async (settings: Settings) => {
    const store = await saveSettings(settings);
    updateConfig(store);
  }, []);

  const updateBackendStore = useCallback(async () => {
    logger.info('updateBackendStore');
    const store = await getOplaConfig();
    updateConfig(store);
  }, []);

  const getActiveModel = useCallback(() => {
    const { services = {} } = configRef.current;
    const { activeService } = services;
    return activeService?.type === AIServiceType.Model ? activeService.modelId : undefined;
  }, [configRef]);

  const setActiveModel = useCallback(
    async (model: string, provider?: string) => {
      logger.info('setActiveModel', model);
      await setBackendActiveModel(model, provider);
      await updateBackendStore();
      const { services = {} } = config;
      const { activeService } = services;
      if (activeService?.type === AIServiceType.Model && activeService.modelId === model) {
        return;
      }
      services.activeService = {
        type: AIServiceType.Model,
        modelId: model,
        providerIdOrName: provider,
      };
      updateConfig({ services });
    },
    [config, updateBackendStore],
  );

  const disconnectBackend = useCallback(async () => {
    // logger.info('unmountBackendProvider');
  }, []);

  const contextValue = useMemo<Context>(
    () => ({
      server,
      config,
      downloads,
      streams,

      startBackend,
      disconnectBackend,
      setSettings,
      updateBackendStore,
      start,
      stop,
      restart,
      setActiveModel,
      getActiveModel,
    }),
    [
      server,
      config,
      downloads,
      streams,

      disconnectBackend,
      restart,
      setActiveModel,
      getActiveModel,
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
