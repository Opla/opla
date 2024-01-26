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
// import { appWindow } from '@tauri-apps/api/window';
// import { confirm } from '@tauri-apps/api/dialog';
// import { listen } from '@tauri-apps/api/event';
import { OplaContext, OplaServer, ServerStatus } from '@/types';
import logger from '../logger';
import {
  restartLLamaCppServer,
  startLLamaCppServer,
  stopLLamaCppServer,
} from '../providers/llama.cpp';
import { LlamaCppArguments } from '../providers/llama.cpp/schema';
import { getOplaConfig, getOplaServerStatus } from './commands';
import { mapKeys } from '../data';
import { toCamelCase } from '../string';

export type Backend = {
  unlisten?: () => void;
  unlistenServer?: () => void;
  unlistenDownloader?: () => void;
  unlistenStream?: () => void;
  context: OplaContext;
  start: (model?: string, parameters?: LlamaCppArguments) => Promise<void>;
  stop: () => Promise<void>;
  restart: (model?: string, parameters?: LlamaCppArguments) => Promise<void>;
};

const connectBackend = async (
  listener: (payload: unknown) => void,
  downloaderlistener: (payload: unknown) => void,
  streamListener: (response: unknown) => void,
) => {
  const { appWindow } = await import('@tauri-apps/api/window');
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await appWindow.onCloseRequested(async () => {
    await stopLLamaCppServer();
  });
  const unlistenServer = await listen('opla-server', (event) => {
    // logger.info('opla-server event', event.payload);
    listener(event);
  });
  const unlistenDownloader = await listen('opla-downloader', (event) => {
    // logger.info('opla-downloader event', event.payload);
    downloaderlistener(event);
  });
  const unlistenStream = await listen('opla-sse', (event) => {
    // logger.info('opla-downloader event', event.payload);
    streamListener(mapKeys(event, toCamelCase));
  });
  const config = await getOplaConfig(); // (await invoke('get_opla_config')) as Store;

  logger.info('oplaConfig', config);
  const { activeModel } = config.models;
  let server: OplaServer = {
    status: ServerStatus.IDLE,
    stout: [],
    sterr: [],
  };
  try {
    const payload = await getOplaServerStatus(); // (await invoke('get_opla_server_status')) as Payload;
    server = { ...server, ...payload };
    logger.info('oplaStatus', server);
  } catch (error) {
    logger.error("can't start LlamaCppServer", error);
    server = { ...server, status: ServerStatus.ERROR, message: error as string };
  }
  const start = async (parameters: any, model = activeModel) => {
    logger.info('start server', parameters);
    return startLLamaCppServer(model, parameters);
  };
  const stop = async () => {
    logger.info('stop server');
    return stopLLamaCppServer();
  };
  const restart = async (parameters: any, model = activeModel) => {
    logger.info('restart server', parameters);
    return restartLLamaCppServer(model, parameters);
  };

  const context = { config, server };

  return {
    context,
    unlisten,
    unlistenServer,
    unlistenDownloader,
    unlistenStream,
    start,
    stop,
    restart,
  } as Backend;
};

export default connectBackend;
