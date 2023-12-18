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
import { invoke } from '@tauri-apps/api/tauri';
import logger from '@/utils/logger';
import { LlamaCppArguments, LlamaCppArgumentsSchema } from './schema';

const stopLLamaCppServer = async () => {
  logger.info('stop LLama.cpp server');
  await invoke('stop_opla_server');
};

const startLLamaCppServer = async (
  model: string,
  metadata: LlamaCppArguments,
  command = 'start_opla_server',
) => {
  logger.info(
    command === 'start_opla_server' ? 'start LLama.cpp server' : 'restart LLama.cpp server',
  );
  const args = LlamaCppArgumentsSchema.parse({ ...metadata, model });
  const response = await invoke(command, args);
  logger.info(`opla server starting: ${response}`, response);
  return response;
};

const restartLLamaCppServer = async (
  model: string,
  metadata: LlamaCppArguments,
) => {
  await stopLLamaCppServer();
  return startLLamaCppServer(model, metadata, 'start_opla_server');
};

export { restartLLamaCppServer, startLLamaCppServer, stopLLamaCppServer };
