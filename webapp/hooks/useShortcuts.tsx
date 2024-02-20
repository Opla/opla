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
import logger from '@/utils/logger';
import { isMac } from '@/utils/misc';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

export type KeyBinding = {
  command: ShortcutIds;
  keys: string | readonly string[];
  description: string;
  scope?: string;
  innerCommand?: boolean;
};

export enum ShortcutIds {
  DISPLAY_THREADS = '#display-threads',
  DISPLAY_ASSISTANTS = '#display-assistants',
  DISPLAY_MODELS = '#display-models',
  DISPLAY_PROVIDERS = '#display-providers',
  DISPLAY_SETTINGS = '#display-settings',
  DISPLAY_SHORTCUTS = '#display-shortcuts',
  TOGGLE_EXPLORER = '#toggle-explorer',
  TOGGLE_FULLSCREEN = '#toggle-fullscreen',
  TOGGLE_DARKMODE = '#toggle-darkmode',
  SEND_MESSAGE = '#send-message',
  NEW_LINE = '#new line',
  DELETE_CONVERSATION = '#delete-conversation',
  ARCHIVE_CONVERSATION = '#archive-conversation',
  CLEAR_CONVERSATION = '#clear-conversation',
  RENAME_CONVERSATION = '#rename-conversation',
  NEW_CONVERSATION = '#new-conversation',
  DELETE_MESSAGE = '#delete-message',
  EDIT_MESSAGE = '#edit-message',
  INSTALL_MODEL = '#install-model',
  LOAD_MODEL = '#load-model',
  CONFIG_GPT = '#config-gpt',
  DELETE_MODEL = '#delete-model',
  TOGGLE_PROVIDER = '#toggle-provider',
  DELETE_PROVIDER = '#delete-provider',
  SAVE_PROVIDER = '#save-provider',
  NEW_PROVIDER = '#new-provider',
}

// mod is the command key on mac, ctrl on windows/linux
export const defaultShortcuts: KeyBinding[] = [
  { command: ShortcutIds.DISPLAY_THREADS, keys: ['mod+1'], description: 'Display threads panel' },
  {
    command: ShortcutIds.DISPLAY_ASSISTANTS,
    keys: ['mod+2'],
    description: 'Display assistants panel',
  },
  { command: ShortcutIds.DISPLAY_MODELS, keys: ['mod+3'], description: 'Display models panel' },
  {
    command: ShortcutIds.DISPLAY_PROVIDERS,
    keys: ['mod+4'],
    description: 'Display providers panel',
  },
  { command: ShortcutIds.DISPLAY_SETTINGS, keys: ['mod+t'], description: 'Toggle Settings' },
  { command: ShortcutIds.DISPLAY_SHORTCUTS, keys: ['mod+k'], description: 'Toggle Shortcuts' },
  { command: ShortcutIds.TOGGLE_EXPLORER, keys: ['mod+e'], description: 'Toggle Explorer' },
  { command: ShortcutIds.TOGGLE_FULLSCREEN, keys: ['mod+f'], description: 'Toggle Fullscreen' },
  { command: ShortcutIds.TOGGLE_DARKMODE, keys: ['mod+d'], description: 'Toggle Dark Mode' },
  {
    command: ShortcutIds.SEND_MESSAGE,
    keys: ['enter'],
    description: 'Send message',
    scope: 'threads',
  },
  { command: ShortcutIds.NEW_LINE, keys: ['mod+enter'], description: 'New line', scope: 'threads' },
  {
    command: ShortcutIds.DELETE_CONVERSATION,
    keys: ['mod+backspace'],
    description: 'Delete selected conversation',
    scope: 'threads',
  },
  {
    command: ShortcutIds.ARCHIVE_CONVERSATION,
    keys: ['mod+a'],
    description: 'Archive selected conversation',
    scope: 'threads',
  },
  {
    command: ShortcutIds.CLEAR_CONVERSATION,
    keys: ['mod+shift+backspace'],
    description: 'Clear selected conversation',
    scope: 'threads',
  },
  {
    command: ShortcutIds.RENAME_CONVERSATION,
    keys: ['mod+r'],
    description: 'Rename selected conversation',
    scope: 'threads',
  },
  {
    command: ShortcutIds.NEW_CONVERSATION,
    keys: ['mod+n'],
    description: 'New conversation',
    scope: 'threads',
  },
  {
    command: ShortcutIds.DELETE_MESSAGE,
    keys: ['mod+delete'],
    description: 'Delete selected message',
    scope: 'threads',
  },
  {
    command: ShortcutIds.EDIT_MESSAGE,
    keys: ['mod+m'],
    description: 'Edit selected message',
    scope: 'threads',
  },
  { command: ShortcutIds.INSTALL_MODEL, keys: ['mod+i'], description: 'Install local model' },
  { command: ShortcutIds.LOAD_MODEL, keys: ['mod+l'], description: 'Load a model' },
  { command: ShortcutIds.CONFIG_GPT, keys: ['mod+g'], description: 'Configure ChatGPT' },
  {
    command: ShortcutIds.DELETE_MODEL,
    keys: ['mod+shift+delete'],
    description: 'Delete selected model',
    scope: 'models',
  },
  {
    command: ShortcutIds.TOGGLE_PROVIDER,
    keys: ['mod+x'],
    description: 'Enable/disable selected provider',
    scope: 'provider',
  },
  {
    command: ShortcutIds.DELETE_PROVIDER,
    keys: ['mod+shift+delete'],
    description: 'Delete selected provider',
    scope: 'provider',
  },
  {
    command: ShortcutIds.SAVE_PROVIDER,
    keys: ['mod+shift+s'],
    description: 'Save selected provider',
    scope: 'provider',
  },
  {
    command: ShortcutIds.NEW_PROVIDER,
    keys: ['mod+p'],
    description: 'New provider',
    scope: 'provider',
  },
];

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
        const command = key; // .substring(1);
        const shortcut = defaultShortcuts.find((s) => s.command === command);
        if (shortcut) {
          const shortcutKeys = Array.isArray(shortcut.keys)
            ? shortcut.keys.join()
            : (shortcut.keys as string);
          if (shortcut && isShortcutMatchingEvent(shortcutKeys, event)) {
            // logger.info('shortcut found=', shortcut.description);
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
