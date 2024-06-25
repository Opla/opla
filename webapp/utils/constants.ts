// Copyright 2024 Mik Bry
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

import { ContextWindowPolicy, ExplorerGroup, PageSettings } from '@/types';
import { ViewName } from '@/types/ui';

export const DefaultModelId = 'TinyLlama/TinyLlama-1.1B-Chat-v0.6';

export const DefaultPageSettings: PageSettings = {
  explorerHidden: false,
  settingsHidden: true,
  explorerWidth: 20,
  settingsWidth: 20,
};

export const DefaultThreadsExplorerGroups: ExplorerGroup[] = [
  {
    title: ViewName.Assistants,
    hidden: false,
    height: 0,
    closed: false,
  },
  {
    title: ViewName.Recent,
    hidden: false,
    height: 0,
    closed: false,
  },
  {
    title: ViewName.Archives,
    hidden: true,
    height: 0,
    closed: false,
  },
];

export const AppName = 'Opla';
export const AppVersion = '0.1.0';

export const DefaultContextWindowPolicy: ContextWindowPolicy = ContextWindowPolicy.Rolling;

export const ContextWindowPolicies: Record<ContextWindowPolicy, string> = {
  [ContextWindowPolicy.None]: 'Send all messages as context even out of context window size.',
  [ContextWindowPolicy.Rolling]:
    'Use a rolling mechanism to maintain constant context window size.',
  [ContextWindowPolicy.Stop]: 'Stop if the context window is full.',
  [ContextWindowPolicy.Last]: "Use only the last sent user's message.",
};
