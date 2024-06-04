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
import {
  AIService,
  AIServiceType,
  LlmStreamResponse,
  OplaContext,
  OplaServer,
  ServerStatus,
} from '@/types';
import logger from '../logger';
import {
  restartLLamaCppServer,
  startLLamaCppServer,
  stopLLamaCppServer,
} from '../providers/llama.cpp';
import { LlamaCppParameters } from '../providers/llama.cpp/constants';
import { getOplaConfig, getOplaServerStatus } from './commands';

export type BackendResult =
  | {
      status: 'error';
      error: string;
    }
  | {
      status: 'ok';
    };

class Backend {
  private static instance: Backend;

  // private activeModel?: string;
  private activeService?: AIService;

  private static streams: Record<string, LlmStreamResponse> = {};

  public static getInstance = () => {
    if (!Backend.instance) {
      Backend.instance = new Backend();
    }
    return Backend.instance;
  };

  public connect = async (
    listeners: Record<string, (event: unknown) => Promise<void>>,
  ): Promise<OplaContext> => {
    const { appWindow } = await import('@tauri-apps/api/window');
    const { listen } = await import('@tauri-apps/api/event');

    const listenersKeys = Object.keys(listeners);

    const promises: Promise<void>[] = [];

    listenersKeys.forEach((key) => {
      promises.push(
        (async () => {
          const listener = listeners[key];
          Backend.listeners[key]?.();
          Backend.listeners[key] = await listen(key, listener);
        })(),
      );
    });
    Promise.all(promises);

    this.onCloseListener?.();
    this.onCloseListener = await appWindow.onCloseRequested(async () => {
      await stopLLamaCppServer();
    });

    const config = await getOplaConfig();

    logger.info('connected backend oplaConfig=', config);
    // const { activeModel } = config.models;
    const { services } = config;
    let activeModel: string | undefined;
    if (services.activeService?.type === AIServiceType.Model) {
      activeModel = services.activeService.modelId;
    }
    this.activeService = services.activeService;
    let server: OplaServer = {
      status: ServerStatus.IDLE,
      stdout: [],
      stderr: [],
    };
    try {
      const payload = await getOplaServerStatus();
      server = { ...server, ...payload };
      logger.info('oplaStatus', server);
    } catch (error) {
      logger.error("can't start LlamaCppServer", error);
      server = { ...server, status: ServerStatus.ERROR, message: error as string };
    }

    this.start = async (parameters: LlamaCppParameters, model = activeModel) => {
      logger.info('start server', model, parameters);
      try {
        await startLLamaCppServer(model, parameters);
      } catch (error) {
        logger.error('stop server error', error);
        return { status: 'error', error: error as string };
      }
      return { status: 'ok' };
    };

    this.stop = async () => {
      logger.info('stop server');
      try {
        await stopLLamaCppServer();
      } catch (error) {
        logger.error('stop server error', error);
        return { status: 'error', error: error as string };
      }
      return { status: 'ok' };
    };

    this.restart = async (parameters: LlamaCppParameters, model = activeModel) => {
      logger.info('restart server', parameters);
      try {
        await restartLLamaCppServer(model, parameters);
      } catch (error) {
        logger.error('stop server error', error);
        return { status: 'error', error: error as string };
      }
      return { status: 'ok' };
    };

    return { config, server } as OplaContext;
  };

  onCloseListener?: () => void;

  static listeners: Record<string, () => void> = {};

  start?: (parameters: LlamaCppParameters, model?: string) => Promise<BackendResult>;

  stop?: () => Promise<BackendResult>;

  restart?: (parameters: LlamaCppParameters, model?: string) => Promise<BackendResult>;
}

export default Backend;
