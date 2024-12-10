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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import logger from '@/utils/logger';
import getBackend from '@/utils/backend';
import {
  OplaContext,
  ServerStatus,
  Settings,
  Download,
  ServerParameters,
  AIServiceType,
  Streams,
  OplaServer,
  MessageStatus,
  Message,
  AIService,
  LlmPayload,
} from '@/types';
import Backend, { BackendResult } from '@/utils/backend/Backend';
import { deepCopy, mapKeys } from '@/utils/data';
import { toCamelCase } from '@/utils/string';
import { getConversation } from '@/utils/data/conversations';
import { changeMessageContent } from '@/utils/data/messages';
import { ParsedPrompt } from '@/utils/parsers';
import { parseLLamaCppServerParameters } from '@/utils/providers/llama.cpp';
import { useServiceStore, useSettingsStore, useThreadStore } from '@/stores';

type StreamPayload = { status: string } & (
  | LlmPayload
  | {
      status: 'error';
      message: string;
      conversationId: string;
      messageId: string;
    }
);

const initialBackendContext: OplaContext = {
  server: {
    status: ServerStatus.IDLE,
    stdout: [],
    stderr: [],
  },
};

type Context = OplaContext & {
  startBackend: () => Promise<void>;
  disconnectBackend: () => Promise<void>;
  settings: Settings;
  activeService?: AIService;
  setSettings: (settings: Settings) => void;
  updateBackendServer: (partials: Partial<OplaServer>) => Promise<void>;
  start: (params: ServerParameters | undefined) => Promise<BackendResult>;
  stop: () => Promise<BackendResult>;
  restart: (params: ServerParameters | undefined) => Promise<BackendResult>;
  setActiveModel: (modelName: string, provider?: string) => Promise<void>;
  getActiveModel: () => string | undefined;
};

const defaultContext: Context = {
  server: initialBackendContext.server,
  settings: {
    startApp: false,
    welcomeSplash: false,
  },
  startBackend: async () => {},
  disconnectBackend: async () => {},
  setSettings: () => {},
  updateBackendServer: async () => {},
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

  const [downloads, saveDownloads] = useState<Download[]>();
  const downloadsRef = useRef<Download[] | undefined>(downloads);
  const [streams, saveStreams] = useState<Streams>();
  const streamsRef = useRef<Streams | undefined>(streams);

  const { conversations, messages, updateMessagesAndConversation } = useThreadStore();

  const { settings, loadSettings, setSettings } = useSettingsStore();
  const { activeService, getActiveModel, setActiveModel, setActiveService } = useServiceStore();

  const backendRef = useRef<Backend>(undefined);

  const updateServer = (partials: Partial<OplaServer>) => {
    const updatedServer: OplaServer = { ...serverRef.current, ...partials } as OplaServer;
    serverRef.current = updatedServer;
    saveServer(updatedServer);
  };

  const updateDownloads = (updatedDownloads: Download[]) => {
    downloadsRef.current = updatedDownloads;
    saveDownloads(updatedDownloads);
  };

  const updateStreams = (updatedStreams: Streams | undefined) => {
    streamsRef.current = updatedStreams;
    saveStreams(updatedStreams);
  };

  const updateBackendServer = useCallback(async (partials: Partial<OplaServer>) => {
    updateServer(partials);
  }, []);

  const updateMessageContent = useCallback(
    async (
      message_or_id: Message | string,
      content: ParsedPrompt | string,
      conversationId: string,
      tempConversationName: string | undefined,
      status: MessageStatus,
      cancelled: boolean,
      error: string | undefined = undefined,
    ) => {
      let message = typeof message_or_id !== 'string' ? message_or_id : undefined;

      const conversationMessages = messages[conversationId];
      if (!message) {
        const id = message_or_id as string;
        message = conversationMessages.find((m) => m.id === id) as Message;
        if (!message) {
          logger.error('message not found');
        }
      }

      const conversation = getConversation(conversationId, conversations);
      if (conversation && message?.content) {
        const text = typeof content === 'string' ? content : content.text;
        const raw = typeof content === 'string' ? content : content.raw;
        const newMessage = changeMessageContent(message, text, raw, status, cancelled, error);
        if (status) {
          newMessage.status = status;
        }
        const newMessages = conversationMessages.map((m) => {
          if (m.id === message.id) {
            return newMessage;
          }
          return m;
        });
        const { updatedMessages } = await updateMessagesAndConversation(
          newMessages,
          conversationMessages,
          { name: tempConversationName },
          conversationId,
          conversations,
        );
        return updatedMessages;
      }
      return undefined;
    },
    [conversations, messages, updateMessagesAndConversation],
  );

  useEffect(() => {
    const afunc = async () => {
      if (streams) {
        const finished = Object.keys(streams).filter((k) => streams[k]?.status === 'finished');
        if (finished.length === 1) {
          const stream = streams[finished[0]];
          await updateMessageContent(
            stream.messageId,
            stream.content.join(''),
            stream.conversationId,
            undefined,
            MessageStatus.Delivered,
            false,
            undefined,
          );
          updateStreams(undefined);
        } else if (finished.length > 1) {
          logger.error('todo multi finished');
        }

        const errors = Object.keys(streams).filter((k) => streams[k]?.status === 'error');
        if (errors.length === 1) {
          const stream = streams[errors[0]];
          await updateMessageContent(
            stream.messageId,
            stream.content.join(''),
            stream.conversationId,
            undefined,
            MessageStatus.Error,
            false,
            stream.content[0],
          );
          updateStreams(undefined);
        } else if (errors.length > 1) {
          logger.error('todo multi errors');
        }

        const cancelled = Object.keys(streams).filter((k) => streams[k]?.status === 'cancel');
        if (cancelled.length === 1) {
          const stream = streams[cancelled[0]];
          let content = stream.content?.join?.('').trim() || '';
          if (content.length === 0) {
            content = 'Cancelled...';
          }
          await updateMessageContent(
            stream.messageId,
            content,
            stream.conversationId,
            undefined,
            MessageStatus.Delivered,
            true,
            undefined,
          );
          updateStreams(undefined);
        } else if (cancelled.length > 1) {
          logger.error('todo multi cancelled');
        }
      }
    };
    afunc();
  }, [streams, updateMessageContent]);

  const backendListener = useCallback(
    async (event: any) => {
      // logger.info('backend event', event);
      if (event.event === 'opla-server' && serverRef.current) {
        if (event.payload.status === ServerStatus.STDOUT) {
          const stdout = deepCopy(serverRef.current.stdout || []);
          const len = stdout.unshift(event.payload.message);
          if (len > 50) {
            stdout.pop();
          }
          // logger.info('stdout', stdout);
          updateServer({
            stdout,
          });
        } else if (event.payload.status === ServerStatus.STDERR) {
          const stderr = deepCopy(serverRef.current.stderr || []);
          const len = stderr.unshift(event.payload.message);
          if (len > 50) {
            stderr.pop();
          }
          // logger.error('stderr', stderr);
          updateServer({
            stderr,
          });
        } else {
          if (
            event.payload.status === ServerStatus.STARTING &&
            activeService?.type !== AIServiceType.Assistant
          ) {
            const service: AIService = {
              type: AIServiceType.Model,
              modelId: event.payload.message,
            };
            setActiveService(service);
          }
          updateServer({
            status: event.payload.status,
            message: event.payload.message,
          });
        }
      }
    },
    [activeService, setActiveService],
  );

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

  const streamListener = useCallback(async (event: { payload: unknown }) => {
    const response = mapKeys<StreamPayload>(event.payload, toCamelCase);
    const currentStreams: Streams = deepCopy(streamsRef.current || {});
    const { conversationId } = response;

    if (!conversationId) {
      logger.error('stream event without conversationId', response);
      return;
    }
    let stream = currentStreams[conversationId];
    if (response.status === 'error') {
      logger.error('stream error', response, currentStreams[conversationId]);
      stream = stream || {
        ...response,
      };
      stream.status = 'error';
      stream.content = [response.message || 'Error in stream process'];
      currentStreams[conversationId] = stream;
      updateStreams(currentStreams);
      return;
    }

    if (response.status === 'success' && stream?.status !== 'error') {
      if (!stream || (stream.prevContent !== response.content && response.content)) {
        const content = stream?.content || [];
        content.push(response.content);
        currentStreams[conversationId] = {
          ...response,
          content,
          prevContent: response.content,
        };
        updateStreams(currentStreams);
      }
      return;
    }
    if (response.status === 'finished' && stream?.status !== 'error') {
      if (stream) {
        stream.status = 'finished';
      } else {
        stream = {
          ...response,
          content: [response.content],
        };
      }
      currentStreams[conversationId] = stream;
      updateStreams(currentStreams);
    }
    if (response.status === 'cancel' && stream?.status !== 'error') {
      if (stream) {
        stream.status = 'cancel';
      } else {
        stream = {
          ...response,
          content: [response.content],
        };
      }
      currentStreams[conversationId] = stream;
      updateStreams(currentStreams);
      logger.info('cancelled', response, stream);
    }
  }, []);

  const startBackend = useCallback(async () => {
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
    logger.info('start backend');
    loadSettings();
  }, [backendListener, downloadListener, streamListener, loadSettings]);

  const restart = useCallback(
    async (params: ServerParameters | undefined = {}): Promise<BackendResult> => {
      const llmParameters = parseLLamaCppServerParameters(params);
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
      const llmParameters = parseLLamaCppServerParameters(params);
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

  const disconnectBackend = useCallback(async () => {
    // logger.info('unmountBackendProvider');
  }, []);

  const contextValue = useMemo<Context>(
    () => ({
      server,
      activeService,
      downloads,
      streams,

      settings,

      startBackend,
      disconnectBackend,
      setSettings,
      updateBackendServer,
      start,
      stop,
      restart,
      setActiveModel,
      getActiveModel,
    }),
    [
      server,
      downloads,
      streams,
      settings,
      activeService,
      disconnectBackend,
      restart,
      setActiveModel,
      getActiveModel,
      setSettings,
      start,
      startBackend,
      stop,
      updateBackendServer,
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
