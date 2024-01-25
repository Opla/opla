// Copyright 2024 mik
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
import logger from './logger';

type InvokeArgs = Record<string, unknown>;

const invokeTauri = async (command: string, args?: any) => {
  const { invoke } = await import('@tauri-apps/api/tauri');
  return invoke(command, args as InvokeArgs);
};

const getPlatformInfos = async () => {
  // TODO
};

interface DialogFilter {
  /** Filter name. */
  name: string;
  /**
   * Extensions to filter, without a `.` prefix.
   * @example
   * ```typescript
   * extensions: ['svg', 'png']
   * ```
   */
  extensions: string[];
}

const openFileDialog = async (multiple = false, filters?: DialogFilter[]) => {
  const { open } = await import('@tauri-apps/api/dialog');
  const selected = await open({
    multiple,
    filters,
  });
  logger.info(selected);
  if (Array.isArray(selected)) {
    // user selected multiple files
  } else if (selected === null) {
    // user cancelled the selection
  } else {
    // user selected a single file
  }
};

export { invokeTauri, getPlatformInfos, openFileDialog };
