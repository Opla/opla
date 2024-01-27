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

class Backend {
  private static instance: Backend;

  private activeModel?: string;

  public context?: OplaContext;

  public static getInstance = () => {
    if (!Backend.instance) {
      Backend.instance = new Backend();
    }
    return Backend.instance;
  };

  public connect = async (
    listener: (payload: unknown) => void,
    downloaderlistener: (payload: unknown) => void,
    streamListener: (response: unknown) => void,
  ) => {
    const { appWindow } = await import('@tauri-apps/api/window');
    const { listen } = await import('@tauri-apps/api/event');

    this.unlisten?.();
    this.unlisten = await appWindow.onCloseRequested(async () => {
      await stopLLamaCppServer();
    });

    this.unlistenServer?.();
    this.unlistenServer = await listen('opla-server', (event) => {
      // logger.info('opla-server event', event.payload);
      listener(event);
    });


    this.unlistenDownloader?.();
    this.unlistenDownloader = await listen('opla-downloader', (event) => {
      // logger.info('opla-downloader event', event.payload);
      downloaderlistener(event);
    });

    this.unlistenStream?.();
    this.unlistenStream = await listen('opla-sse', (event) => {
      // logger.info('opla-downloader event', event.payload);
      streamListener(mapKeys(event, toCamelCase));
    });
    const config = await getOplaConfig(); // (await invoke('get_opla_config')) as Store;

    logger.info('connected backend oplaConfig=', config);
    const { activeModel } = config.models;
    this.activeModel = activeModel;
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

    this.start = async (parameters: LlamaCppArguments, model = activeModel) => {
      logger.info('start server', parameters);
      return startLLamaCppServer(model, parameters);
    };

    this.stop = async () => {
      logger.info('stop server');
      return stopLLamaCppServer();
    };

    this.restart = async (parameters: LlamaCppArguments, model = activeModel) => {
      logger.info('restart server', parameters);
      return restartLLamaCppServer(model, parameters);
    };

    this.context = { config, server };

    return this.context;
  };

  unlisten?: () => void;

  unlistenServer?: () => void;

  unlistenDownloader?: () => void;

  unlistenStream?: () => void;

  start?: (parameters: LlamaCppArguments, model?: string) => Promise<unknown>;

  stop?: () => Promise<void>;

  restart?: (parameters: LlamaCppArguments, model?: string) => Promise<unknown>;
}

export default Backend;
