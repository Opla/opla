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

import { PageSettings } from '@/types';

export const DefaultPageSettings: PageSettings = {
  explorerHidden: false,
  settingsHidden: false,
  explorerWidth: 20,
  settingsWidth: 20,
};

export const AppName = 'Opla';
export const AppVersion = '0.1.0';

export const defaultShortcuts = [
  { command: 'toggle-explorer', keys: ['Ctrl', 'E'], description: 'Toggle Explorer' },
  { command: 'toggle-settings', keys: ['Ctrl', 'S'], description: 'Toggle Settings' },
  { command: 'toggle-shortcuts', keys: ['Ctrl', 'H'], description: 'Toggle Shortcuts' },
  { command: 'toggle-fullscreen', keys: ['Ctrl', 'F'], description: 'Toggle Fullscreen' },
  { command: 'toggle-darkmode', keys: ['Ctrl', 'D'], description: 'Toggle Dark Mode' },
  { command: 'send-message', keys: ['Enter'], description: 'Send message', page: 'threads' },
  { command: 'new line', keys: ['Ctrl', 'Enter'], description: 'New line', page: 'threads' },
  {
    command: 'delete-conversation',
    keys: ['Ctrl', 'Backspace'],
    description: 'Delete selected conversation',
    page: 'threads',
  },
  {
    command: 'clear-conversation',
    keys: ['Ctrl', 'Shift', 'Backspace'],
    description: 'Clear selected conversation',
    page: 'threads',
  },
  {
    command: 'rename-conversation',
    keys: ['Ctrl', 'R'],
    description: 'Rename selected conversation',
    page: 'threads',
  },
  {
    command: 'new-conversation',
    keys: ['Ctrl', 'N'],
    description: 'New conversation',
    page: 'threads',
  },
  {
    command: 'delete-message',
    keys: ['Ctrl', 'Delete'],
    description: 'Delete selected message',
    page: 'threads',
  },
  {
    command: 'edit-message',
    keys: ['Ctrl', 'M'],
    description: 'Edit selected message',
    page: 'threads',
  },

  { command: 'install-model', keys: ['Ctrl', 'I'], description: 'Install local model' },
  { command: 'load-model', keys: ['Ctrl', 'L'], description: 'Load a model' },
  {
    command: 'delete-model',
    keys: ['Ctrl', 'Shift', 'Delete'],
    description: 'Delete selected model',
    page: 'models',
  },
  {
    command: 'toggle-provider',
    keys: ['Ctrl', 'P'],
    description: 'Toggle selected provider',
    page: 'provider',
  },
  {
    command: 'delete-provider',
    keys: ['Ctrl', 'Shift', 'Delete'],
    description: 'Delete selected provider',
    page: 'provider',
  },
  {
    command: 'save-provider',
    keys: ['Ctrl', 'S'],
    description: 'Save selected provider',
    page: 'provider',
  },
  { command: 'new-provider', keys: ['Ctrl', 'N'], description: 'New provider', page: 'provider' },
];
