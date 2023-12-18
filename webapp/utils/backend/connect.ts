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
import { appWindow } from '@tauri-apps/api/window';
import { confirm } from '@tauri-apps/api/dialog';
import { listen } from '@tauri-apps/api/event';
import { OplaConfig } from '@/types';
import { invoke } from '@tauri-apps/api';
import { BackendPayload, BackendStatus } from '../../types/backend';
import logger from '../logger';
import {
  restartLLamaCppServer,
  startLLamaCppServer,
  stopLLamaCppServer,
} from '../providers/llama.cpp';
import { LlamaCppArguments } from '../providers/llama.cpp/schema';

export type Backend = {
  unlisten?: () => void;
  unlistenServer?: () => void;
  configuration: OplaConfig;
  payload: { status: BackendStatus; message: string };
  start: (model?: string, parameters?: LlamaCppArguments) => Promise<void>;
  stop: () => Promise<void>;
  restart: (model?: string, parameters?: LlamaCppArguments) => Promise<void>;
};

const connectBackend = async (listener: (payload: any) => void) => {
  const unlisten = await appWindow.onCloseRequested(async (event) => {
    const confirmed = await confirm('Are you sure?');
    if (!confirmed) {
      // user did not confirm closing the window; let's prevent it
      event.preventDefault();
      return;
    }
    await stopLLamaCppServer();
  });
  const unlistenServer = await listen('opla-server', (event) => {
    // logger.info('opla-server event', event.payload);
    listener(event);
  });

  const oplaConfig = (await invoke('get_opla_config')) as OplaConfig;

  logger.info('oplaConfig', oplaConfig);
  const defaultModel = oplaConfig.models.default_model;
  let payload: BackendPayload;
  try {
    payload = (await invoke('get_opla_server_status')) as BackendPayload;
    logger.info('oplaStatus', payload);
  } catch (error) {
    logger.error("can't start LlamaCppServer", error);
    payload = { status: BackendStatus.ERROR, message: error as string };
  }
  const start = async (parameters: any, model = defaultModel) => {
    logger.info('start server', parameters);
    return startLLamaCppServer(model, parameters);
  };
  const stop = async () => {
    logger.info('stop server');
    return stopLLamaCppServer();
  };
  const restart = async (parameters: any, model = defaultModel) => {
    logger.info('restart server', parameters);
    return restartLLamaCppServer(model, parameters);
  };
  return {
    configuration: oplaConfig,
    unlisten,
    unlistenServer,
    payload,
    start,
    stop,
    restart,
  } as Backend;
};

export default connectBackend;
