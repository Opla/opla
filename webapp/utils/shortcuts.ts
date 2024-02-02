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

import { defaultShortcuts } from '@/hooks/useShortcuts';
import { isMac } from './misc';

function findShortcut(command: string) {
  return defaultShortcuts.find((s) => s.command === command);
}

function shortcutAsText(command: string) {
  const shortcut = findShortcut(command);
  if (!shortcut) {
    return '';
  }
  let keys = Array.isArray(shortcut.keys) ? shortcut.keys.join(' ') : (shortcut.keys as string);
  keys = keys.replace('mod', isMac() ? '⌘' : 'Ctrl');
  keys = keys.replace('shift', '⇧');
  keys = keys.replace('alt', isMac() ? '⌥' : 'Alt');
  keys = keys.replaceAll('+', '');
  keys = keys.replace('backspace', '⌫');
  keys = keys.replace('enter', '⏎');
  keys = keys.replace('delete', '⌦');

  return keys.toUpperCase();
}

export { shortcutAsText, findShortcut };
