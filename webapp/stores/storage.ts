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

import { StateStorage } from 'zustand/middleware';
import dataStorage, { StorageType } from '@/utils/dataStorage';

async function get(name: string): Promise<string | null> {
  const value = (await dataStorage(StorageType.TextFile).getItem(name)) as string;
  return value;
}

async function set(name: string, value: string): Promise<void> {
  await dataStorage(StorageType.TextFile).setItem(name, value);
}

async function del(name: string): Promise<void> {
  await dataStorage(StorageType.TextFile).setItem(name, undefined);
}

// Custom storage object
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> =>
    /* logger.info(name, 'has been retrieved'); */
    (await get(name)) || null,
  setItem: async (name: string, value: string): Promise<void> => {
    // logger.info(name, 'with value', value, 'has been saved');
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    // logger.info(name, 'has been deleted');
    await del(name);
  },
};

export default storage;
