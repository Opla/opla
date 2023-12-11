// Copyright 2023 mik
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
import { invoke } from '@tauri-apps/api/tauri';
import { homeDir } from '@tauri-apps/api/path';
import logger from '@/utils/logger';
import { LlamaCppArguments, LlamaCppArgumentsSchema } from './types';

const stopLLamaCppServer = async () => {
  logger.info('stop LLama.cpp server');
  await invoke('stop_opla_server');
};

const startLLamaCppServer = async (
  modelsPath: string,
  modelFile: string,
  metadata: LlamaCppArguments,
) => {
  logger.info('start LLama.cpp server');
  const homeDirPath = await homeDir();
  logger.info(`homeDirPath=${homeDirPath}`);
  const model = `${homeDirPath}${modelsPath}/${modelFile}`;
  /* const port = metadata.port || '8080';
  const host = metadata.host || '127.0.0.1';
  const contextSize = metadata.port || '512';
  const threads = metadata.port || '4';
  const nGpuLayers = metadata.port || '0'; */
  const args = LlamaCppArgumentsSchema.parse({ ...metadata, model });
  const child = await invoke('start_opla_server', args);

  return child;
};

export { startLLamaCppServer, stopLLamaCppServer };
