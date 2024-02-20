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
import logger from '../logger';

type InvokeArgs = Record<string, unknown>;

export const invokeTauri = async <T>(command: string, args?: any) => {
  const { invoke } = await import('@tauri-apps/api/tauri');
  return invoke(command, args as InvokeArgs) as T;
};

export const getPlatformInfos = async () => {
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

export const openFileDialog = async (multiple = false, filters?: DialogFilter[], asset = false) => {
  const { open } = await import('@tauri-apps/api/dialog');
  let selected = await open({
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
  if (asset) {
    const { convertFileSrc } = await import('@tauri-apps/api/tauri');
    if (typeof selected === 'string') {
      selected = convertFileSrc(selected);
    } else if (Array.isArray(selected)) {
      selected = selected.map((file) => convertFileSrc(file));
    }
  }
  return selected;
};

export const saveFileDialog = async (filters?: DialogFilter[]) => {
  const { save } = await import('@tauri-apps/api/dialog');
  const selected = await save({
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
  return selected;
};

export const writeTextFile = async (filename: string, contents: string, createDir: boolean) => {
  const { writeFile: fsWriteFile } = await import('@tauri-apps/api/fs');
  const { join } = await import('@tauri-apps/api/path');
  let path = filename;
  if (createDir) {
    const dataDir = (await invokeTauri('get_data_dir')) as string;
    path = await join(dataDir, filename);
    const filepath = filename.split('/').slice(0, -1).join('/');
    if (filepath.length > 0) {
      await invokeTauri('create_dir', { path: filepath, dataDir });
    }
  }
  return fsWriteFile({
    contents,
    path,
  });
};

export const readTextFile = async (filename: string, isDatadir = true) => {
  const { readTextFile: fsReadTextFile } = await import('@tauri-apps/api/fs');
  const { join } = await import('@tauri-apps/api/path');
  let dataDir = '';
  if (isDatadir) {
    dataDir = (await invokeTauri('get_data_dir')) as string;
  }
  return fsReadTextFile(await join(dataDir, filename));
};

export const deleteFile = async (filename: string, isDatadir = true) => {
  const { removeFile: fsRemoveFile } = await import('@tauri-apps/api/fs');
  const { join } = await import('@tauri-apps/api/path');
  let dataDir = '';
  if (isDatadir) {
    dataDir = (await invokeTauri('get_data_dir')) as string;
  }
  return fsRemoveFile(await join(dataDir, filename));
};

export const deleteDir = async (dirname: string, isDatadir = true, recursive = false) => {
  const { removeDir: fsRemoveDir } = await import('@tauri-apps/api/fs');
  const { join } = await import('@tauri-apps/api/path');
  let dataDir = '';
  if (isDatadir) {
    dataDir = (await invokeTauri('get_data_dir')) as string;
  }
  return fsRemoveDir(await join(dataDir, dirname), { recursive });
};

export const fileExists = async (filename: string, path?: string) => {
  const { exists } = await import('@tauri-apps/api/fs');
  const { join } = await import('@tauri-apps/api/path');
  let dir = path as string;
  if (!dir) {
    dir = (await invokeTauri('get_data_dir')) as string;
  }
  return exists(await join(dir, filename));
};
