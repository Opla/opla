// Copyright 2024 Mik Bry
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
import { FileEntry } from '@tauri-apps/api/fs';
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
  const { join, dirname } = await import('@tauri-apps/api/path');
  let path = filename;
  if (createDir) {
    const dataDir = (await invokeTauri('get_data_path')) as string;
    path = await join(dataDir, filename);
    // const filepath = filename.split(sep).slice(0, -1).join(sep);
    const filepath = await dirname(filename);
    if (filepath.length > 0) {
      await invokeTauri('create_dir', { path: filepath, dataDir });
      // await createPaths(await join(dataDir, filepath));
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
    dataDir = (await invokeTauri('get_data_path')) as string;
  }
  return fsReadTextFile(await join(dataDir, filename));
};

export const deleteFile = async (filename: string, isDatadir = true) => {
  const { removeFile: fsRemoveFile, exists } = await import('@tauri-apps/api/fs');
  const { join } = await import('@tauri-apps/api/path');
  let dataDir = '';
  if (isDatadir) {
    dataDir = (await invokeTauri('get_data_path')) as string;
  }
  const path = await join(dataDir, filename);
  if (await exists(path)) {
    await fsRemoveFile(path);
  }
};

export const deleteDir = async (dirname: string, isDatadir = true, recursive = false) => {
  const { removeDir: fsRemoveDir } = await import('@tauri-apps/api/fs');
  const { join } = await import('@tauri-apps/api/path');
  let dataDir = '';
  if (isDatadir) {
    dataDir = (await invokeTauri('get_data_path')) as string;
  }
  return fsRemoveDir(await join(dataDir, dirname), { recursive });
};

export const deleteUnusedConversationsDir = async (excludedDirs: string[]) => {
  const {
    removeDir: fsRemoveDir,
    removeFile: fsRemoveFile,
    readDir: fsReadDir,
  } = await import('@tauri-apps/api/fs');
  const { join } = await import('@tauri-apps/api/path');
  const dataDir = (await invokeTauri('get_data_path')) as string;
  const dirs = await fsReadDir(dataDir, { recursive: true });
  const promises: Promise<void>[] = [];
  dirs.forEach((dir) => {
    const { path } = dir;
    if (dir.children && !excludedDirs.includes(dir.path)) {
      promises.push(
        (async (children: FileEntry[]) => {
          const isConversation = children.some((child) => child.path.endsWith('messages.json'));
          if (isConversation) {
            try {
              await fsRemoveFile(await join(path, 'messages.json'));
            } catch (error) {
              logger.error(error);
            }
            fsRemoveDir(path, { recursive: true });
          }
        })(dir.children),
      );
    }
  });
  return Promise.all(promises);
};

export const fileExists = async (fileName: string) => {
  const result = (await invokeTauri('file_exists', { fileName })) as boolean;
  return result;
};

export const getPathComponents = async (resourcePath: string) => {
  const { basename, dirname, extname } = await import('@tauri-apps/api/path');
  const filename = await basename(resourcePath);
  const path = await dirname(resourcePath);
  const ext = await extname(resourcePath);
  const name = filename.replace(`.${ext}`, '');
  return { filename, path, ext, name };
};

export const convertAssetFile = async  (file: string) => {
  const { convertFileSrc } = await import('@tauri-apps/api/tauri');
  return convertFileSrc(file);
}