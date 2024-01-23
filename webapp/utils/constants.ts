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

import { KeyBinding, PageSettings } from '@/types';

export const DefaultPageSettings: PageSettings = {
  explorerHidden: false,
  settingsHidden: false,
  explorerWidth: 20,
  settingsWidth: 20,
};

export const AppName = 'Opla';
export const AppVersion = '0.1.0';

// mod is the command key on mac, ctrl on windows/linux
export const defaultShortcuts: KeyBinding[] = [
  { command: 'toggle-explorer', keys: ['mod+e'], description: 'Toggle Explorer' },
  { command: 'toggle-settings', keys: ['mod+t'], description: 'Toggle Settings' },
  { command: 'toggle-shortcuts', keys: ['mod+h'], description: 'Toggle Shortcuts' },
  { command: 'toggle-fullscreen', keys: ['mod+f'], description: 'Toggle Fullscreen' },
  { command: 'toggle-darkmode', keys: ['mod+d'], description: 'Toggle Dark Mode' },
  { command: 'send-message', keys: ['enter'], description: 'Send message', scope: 'threads' },
  { command: 'new line', keys: ['mod+enter'], description: 'New line', scope: 'threads' },
  {
    command: 'delete-conversation',
    keys: ['mod+backspace'],
    description: 'Delete selected conversation',
    scope: 'threads',
  },
  {
    command: 'clear-conversation',
    keys: ['mod+shift+backspace'],
    description: 'Clear selected conversation',
    scope: 'threads',
  },
  {
    command: 'rename-conversation',
    keys: ['mod+r'],
    description: 'Rename selected conversation',
    scope: 'threads',
  },
  {
    command: 'new-conversation',
    keys: ['mod+n'],
    description: 'New conversation',
    scope: 'threads',
  },
  {
    command: 'delete-message',
    keys: ['mod+delete'],
    description: 'Delete selected message',
    scope: 'threads',
  },
  {
    command: 'edit-message',
    keys: ['mod+m'],
    description: 'Edit selected message',
    scope: 'threads',
  },

  { command: 'install-model', keys: ['mod+i'], description: 'Install local model' },
  { command: 'load-model', keys: ['mod+l'], description: 'Load a model' },
  { command: 'config-gpt', keys: ['mod+g'], description: 'Configure ChatGPT' },
  {
    command: 'delete-model',
    keys: ['mod+shift+delete'],
    description: 'Delete selected model',
    scope: 'models',
  },
  {
    command: 'toggle-provider',
    keys: ['mod+x'],
    description: 'Toggle selected provider',
    scope: 'provider',
  },
  {
    command: 'delete-provider',
    keys: ['mod+shift+delete'],
    description: 'Delete selected provider',
    scope: 'provider',
  },
  {
    command: 'save-provider',
    keys: ['mod+shift+s'],
    description: 'Save selected provider',
    scope: 'provider',
  },
  { command: 'new-provider', keys: ['mod+p'], description: 'New provider', scope: 'provider' },
];
