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
import { toast } from '@/components/ui/Toast';
import { defaultShortcuts } from '@/utils/constants';
import logger from '@/utils/logger';
import { isMac } from '@/utils/misc';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

export type ShortcutCallback = (event: KeyboardEvent) => void;
export type RefType<T> = T | null;
export type Options = {
  targetNode?: HTMLElement;
  preventDefault?: boolean;
};

const isShortcutMatchingEvent = (shortcut: string, event: KeyboardEvent) => {
  if (!shortcut) {
    return false;
  }
  const keys = shortcut.split('+');
  const key = keys.pop();

  if (!event.key || !key) {
    return false;
  }
  if (keys.includes('mod')) {
    keys.push(isMac() ? 'meta' : 'ctrl');
  }
  const result =
    keys.includes('ctrl') === event.ctrlKey &&
    keys.includes('shift') === event.shiftKey &&
    keys.includes('alt') === event.altKey &&
    keys.includes('meta') === event.metaKey &&
    key.toLowerCase() === event.key.toLowerCase();
  return result;
};

const useShortcuts = <T extends HTMLElement>(
  keys: string | string[],
  callback: ShortcutCallback,
  options: Options = {},
) => {
  const ref = useRef<RefType<T>>(null);

  const callbackRef = useRef(callback);

  const useSafeLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
  useSafeLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // handle what happens on key press

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      const key = Array.isArray(keys) ? keys.join() : (keys as string);
      // logger.info('shortcut event=', event);
      if (key === 'info') {
        defaultShortcuts.find((shortcut) => {
          // logger.log('shortcut info', event, shortcut);
          const shortcutKeys = Array.isArray(shortcut.keys)
            ? shortcut.keys.join()
            : (shortcut.keys as string);
          if (isShortcutMatchingEvent(shortcutKeys, event)) {
            logger.info('shortcut=', shortcut.description);
            toast.message(shortcut.description);
            callbackRef.current(event);
            return true;
          }
          return false;
        });
        return;
      }
      // check if one of the key is part of the ones we want
      if (key === '*' || (Array.isArray(keys) && keys.some((k) => event.key === k))) {
        callbackRef.current(event);
      }
      if (key.startsWith('#')) {
        const command = key.substring(1);
        const shortcut = defaultShortcuts.find((s) => s.command === command);
        if (shortcut) {
          const shortcutKeys = Array.isArray(shortcut.keys)
            ? shortcut.keys.join()
            : (shortcut.keys as string);
          if (shortcut && isShortcutMatchingEvent(shortcutKeys, event)) {
            logger.info('shortcut found=', shortcut.description);
            callbackRef.current(event);
          }
        }
      }
    },
    [keys],
  );

  const targetNode = ref.current ?? options.targetNode ?? document;
  useEffect(() => {
    targetNode.addEventListener('keydown', handleKeyPress as EventListenerOrEventListenerObject);

    // remove the event listener
    return () =>
      targetNode.removeEventListener(
        'keydown',
        handleKeyPress as EventListenerOrEventListenerObject,
      );
  }, [handleKeyPress, targetNode]);

  return ref;
};

export default useShortcuts;
