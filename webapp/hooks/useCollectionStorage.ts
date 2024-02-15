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
// limit

import { useState } from 'react';
import dataStorage from '@/utils/dataStorage';
import logger from '@/utils/logger';
import { toast } from '@/components/ui/Toast';

export default function useCollectionStorage<T>(
  collectionId: string,
): [
  (key: string, defaultValue: T) => T,
  (key: string, defaultValue: T) => Promise<T>,
  (key: string, value: T) => Promise<void>,
  (key: string) => Promise<void>,
] {
  const [collection, setCollection] = useState<Record<string, T>>({});

  const readValue = async (key: string, defaultValue: T) => {
    let v = collection[key];
    if (!v) {
      v = (await dataStorage().getItem(collectionId, defaultValue, key)) as T;
      if (v) {
        setCollection({ ...collection, [key]: v });
      }
    }
    return v;
  };

  const updateValue = async (key: string, v: T) => {
    try {
      setCollection({ ...collection, [key]: v });
      await dataStorage().setItem(collectionId, v, key);
    } catch (e) {
      logger.error(e);
      toast.error(`Error saving data ${e}`);
    }
  };

  const getValue = (key: string, defaultValue: T) => {
    console.log('getValue', key, defaultValue, collection, collection[key]);
    return collection[key] || defaultValue
  };

  const deleteValue = async (key: string) => {
    try {
      const newCollection = { ...collection };
      delete newCollection[key];
      setCollection(newCollection);
      await dataStorage().setItem(collectionId, undefined, key);
    } catch (e) {
      logger.error(e);
      toast.error(`Error deleting data ${e}`);
    }
  };

  return [getValue, readValue, updateValue, deleteValue];
}
