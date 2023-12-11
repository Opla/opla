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
import { appWindow } from '@tauri-apps/api/window';
import { confirm } from '@tauri-apps/api/dialog';
import { Provider } from '@/types';
import logger from '../logger';
import { startLLamaCppServer, stopLLamaCppServer } from '../providers/llama.cpp';
import { LlamaCppArguments } from '../providers/llama.cpp/types';

const startDesktop = async (oplaConfiguration: Provider) => {
  const unlisten = await appWindow.onCloseRequested(async (event) => {
    const confirmed = await confirm('Are you sure?');
    if (!confirmed) {
      // user did not confirm closing the window; let's prevent it
      event.preventDefault();
      return;
    }
    await stopLLamaCppServer();
  });
  logger.info('init Opla desktop');
  const modelsPath = `dev/ai/models`;
  const modelFile = 'openhermes-7b-v2.5/ggml-model-q4_k.gguf';
  const metadata = oplaConfiguration.metadata as unknown as {
    server: { parameters: LlamaCppArguments };
  };
  await startLLamaCppServer(modelsPath, modelFile, metadata.server.parameters);
  return unlisten;
};

export default startDesktop;
