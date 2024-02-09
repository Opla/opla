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

import { toast } from 'sonner';
import logger from './logger';
import { readTextFile, writeTextFile } from './backend/tauri';

enum StorageType {
  File,
  LocalStorage,
}

type DataStorage = {
  getItem<T>(key: string, defaultValue?: T, path?: string): Promise<T | null>;
  setItem<T>(key: string, value: T, path?: string): Promise<void>;
};

const readFromLocalStorage = async <T>(key: string, path: string) => {
  let text: string;
  try {
    text = await readTextFile(`${path}/${key}.json`);
  } catch (e) {
    logger.error(`Failed to read item ${key} from fileStorage`);
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    logger.error(`Failed to parse item ${key} from fileStorage`);
    toast.error(`Failed to parse item ${key} from fileStorage`);
  }
  return null;
};

const writeToLocalStorage = async <T>(key: string, value: T, path: string) => {
  await writeTextFile(`${path}/${key}.json`, JSON.stringify(value, null, 2), true);
};

const LocalStorage: DataStorage = {
  async getItem<T>(key: string, defaultValue?: T) {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    if (item === 'null') return defaultValue;
    if (item === 'undefined') return defaultValue;

    try {
      return JSON.parse(item);
    } catch {
      logger.error(`Failed to parse item ${key} from localStorage`);
      toast.error(`Failed to parse item ${key} from localStorage`);
    }

    return item as T;
  },
  async setItem<T>(key: string, value: T) {
    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },
};

const MockStorage: DataStorage = {
  async getItem() {
    logger.warn('MockStorage.getItem() called');
    return null;
  },
  async setItem() {
    logger.warn('MockStorage.setItem() called');
  },
};

const FileStorage: DataStorage = {
  async getItem<T>(key: string, defaultValue?: T, path = '') {
    logger.warn('FileStorage.getItem() called', path);
    let value = await readFromLocalStorage<T>(key, path);
    if (!value || (Array.isArray(value) && value.length === 0)) {
      value = await LocalStorage.getItem<T>(key, defaultValue);
      if (value || defaultValue) {
        await writeToLocalStorage(key, value || defaultValue, path);
      }
    }
    return value;
  },
  async setItem<T>(key: string, value: T, path = '') {
    writeToLocalStorage(key, value, path);
  },
};

const persistentStorage = (type = StorageType.File): DataStorage => {
  if (window && window.localStorage) {
    switch (type) {
      case StorageType.File:
        return FileStorage;
      case StorageType.LocalStorage:
        return LocalStorage;
      default:
    }
  }
  return MockStorage;
};

export default persistentStorage;
