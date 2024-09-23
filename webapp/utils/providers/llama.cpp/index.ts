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

// import { invoke } from '@tauri-apps/api/tauri';
import logger from '@/utils/logger';
import { invokeTauri } from '@/utils/backend/tauri';
import { mapKeys } from '@/utils/data';
import { toSnakeCase } from '@/utils/string';
import { ServerParameters } from '@/types';
import { LlamaCppParameters, LlamaCppArgumentsSchema, LlamaCppOptions } from './constants';

const parseLLamaCppServerParameters = (params: ServerParameters) =>
  LlamaCppArgumentsSchema.parse(params);

const stopLLamaCppServer = async () => {
  logger.info('stop LLama.cpp server');
  await invokeTauri('stop_opla_server');
};

const startLLamaCppServer = async (
  model: string | undefined,
  _parameters: LlamaCppParameters,
  command = 'start_opla_server',
): Promise<unknown> => {
  logger.info(
    command === 'start_opla_server' ? 'start LLama.cpp server' : 'restart LLama.cpp server',
  );
  const parameters = parseLLamaCppServerParameters({ ..._parameters, model });
  const args = mapKeys({ parameters }, toSnakeCase);
  const response = await invokeTauri(command, args);
  logger.info(`opla server starting: ${response}`, response);
  return response;
};

const restartLLamaCppServer = async (
  model: string | undefined,
  parameters: LlamaCppParameters,
): Promise<unknown> => {
  await stopLLamaCppServer();
  return startLLamaCppServer(model, parameters, 'start_opla_server');
};

const getCommandLineOptions = (model: string | undefined, _parameters: ServerParameters) => {
  if (!model) {
    return '';
  }
  const parameters = parseLLamaCppServerParameters({ ..._parameters });

  return Object.keys(parameters).reduce(
    (options: string, key: string) => `${options} ${LlamaCppOptions[key][0]} ${parameters[key]}`,
    `${LlamaCppOptions['model'][0]} ${model}`,
  );
};

export {
  parseLLamaCppServerParameters,
  restartLLamaCppServer,
  startLLamaCppServer,
  stopLLamaCppServer,
  getCommandLineOptions,
};
