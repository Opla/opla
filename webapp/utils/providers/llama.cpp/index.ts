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
import { Command } from '@tauri-apps/api/shell';
import logger from '@/utils/logger';

const spawnCommand = async (name: string, exec: string, args: string[]) => {
  const command = Command.sidecar(exec, args);
  command.on('close', (data) => {
    logger.info(`${name} finished with code ${data.code} and signal ${data.signal}`);
  });
  command.on('error', (error) => logger.info(`${name} error: "${error}"`));
  command.stdout.on('data', (line) => logger.info(`${name} stdout: "${line}"`));
  command.stderr.on('data', (line) => logger.error(`${name} stderr: "${line}"`));

  const child = await command.spawn();
  logger.info(`${name} pid: ${child.pid}`);
  return child;
};

const startLLamaCppServer = async (homeDirPath: string, modelsPath: string) => {
  logger.info('start LLama.cpp server');
  const child = spawnCommand('llama.cpp', 'binaries/llama.cpp/llama.cpp.server', [
    '-m',
    `${homeDirPath}/${modelsPath}/openhermes-7b-v2.5/ggml-model-q4_k.gguf`,
    '--port',
    '8080',
    '--host',
    '127.0.0.1',
    '-c',
    '512',
    '-t',
    '4',
    '-ngl',
    '0',
  ]);
  return child;
};

export default startLLamaCppServer;
