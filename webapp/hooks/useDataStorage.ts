// Inspiration From
// https://gist.github.com/Mon4ik/2636100f5b74ee14e35cf283700616fe

/* `useLocalStorage`
 *
 * Features:
 *  - JSON Serializing
 *  - Also value will be updated everywhere, when value updated (via `storage` event)
 */

import { useEffect, useState } from 'react';
import dataStorage from '@/utils/dataStorage';
import logger from '@/utils/logger';
import { toast } from '@/components/ui/Toast';

export default function useDataStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState(undefined as T);

  useEffect(() => {
    const init = async () => {
      const item = await dataStorage().getItem(key, defaultValue);

      if (item) {
        setValue(item as T);
      }
    };
    init();
    async function handler(e: StorageEvent) {
      if (e.key !== key) return;
      const i = await dataStorage().getItem(key);
      logger.info('storage event', e, key, i);
      setValue(i as T);
    }
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener('storage', handler);
    };
  }, [defaultValue, key]);

  const setValueWrap = (v: T) => {
    try {
      setValue(v);
      dataStorage().setItem(key, v);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', { key }));
      }
    } catch (e) {
      logger.error(e);
      toast.error(`Error saving data ${e}`);
    }
  };

  return [value, setValueWrap];
}
