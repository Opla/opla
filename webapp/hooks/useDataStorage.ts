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

import { useEffect, useState } from 'react';
import dataStorage from '@/utils/dataStorage';
import logger from '@/utils/logger';
import { toast } from '@/components/ui/Toast';
import { deepCopy } from '@/utils/data';

export default function useDataStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState(undefined as T);
  const [first, setFirst] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!first) return;
      const item = await dataStorage().getItem(key, defaultValue);
      if (item) {
        setValue(item as T);
      }
      setFirst(false);
    };
    init();
  }, [defaultValue, first, key]);

  const updateValue = (v: T) => {
    try {
      const copy = deepCopy(v);
      setValue(() => copy);
      dataStorage().setItem(key, copy);
    } catch (e) {
      logger.error(e);
      toast.error(`Error saving data ${e}`);
    }
  };

  return [value, updateValue];
}
