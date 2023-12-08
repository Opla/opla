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
import { homeDir } from '@tauri-apps/api/path';
import { appWindow } from '@tauri-apps/api/window';
import { confirm } from '@tauri-apps/api/dialog';
import { Child } from '@tauri-apps/api/shell';
import logger from '../logger';
import startLLamaCppServer from '../providers/llama.cpp';

const startDesktop = async () => {
  let serverProcess: Child;
  // eslint-disable-next-line no-underscore-dangle
  const unlisten = await appWindow.onCloseRequested(async (event) => {
    const confirmed = await confirm('Are you sure?');
    if (!confirmed) {
      // user did not confirm closing the window; let's prevent it
      event.preventDefault();
    }
    serverProcess?.kill();
  });
  logger.info('init Opla desktop');
  const homeDirPath = await homeDir();
  logger.info(`homeDirPath=${homeDirPath}`);
  const modelsPath = `/dev/ai/models`;
  serverProcess = await startLLamaCppServer(homeDirPath, modelsPath);
  return unlisten;
};

export default startDesktop;
