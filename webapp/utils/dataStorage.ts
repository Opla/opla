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

type DataStorage = {
  getItem<T>(key: string): T | null;
  setItem<T>(key: string, value: T): void;
};

const LocalStorage: DataStorage = {
  getItem(key: string) {
    const item = localStorage.getItem(key);

    if (item === null) return null;
    if (item === 'null') return null;
    if (item === 'undefined') return undefined;

    try {
      return JSON.parse(item);
    } catch {
      logger.error(`Failed to parse item ${key} from localStorage`);
      toast.error(`Failed to parse item ${key} from localStorage`);
    }

    return item;
  },
  setItem<T>(key: string, value: T) {
    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },
};

const MockStorage: DataStorage = {
  getItem() {
    logger.warn('MockStorage.getItem() called');
    return null;
  },
  setItem() {
    logger.warn('MockStorage.setItem() called');
  },
};

const persistentStorage = () => (window && window?.localStorage ? LocalStorage : MockStorage);

export default persistentStorage;
