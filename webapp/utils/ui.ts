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

import { BasicState } from '@/types/ui';
import { PromptToken, PromptTokenState, PromptTokenType } from './prompt';

// eslint-disable-next-line import/prefer-default-export
export const getStateColor = (
  state: BasicState | undefined,
  prefix = 'bg',
  defaultEnabled = false,
) => {
  const suffix = prefix === 'bg' ? '500' : '400';
  if (!state || state === BasicState.disabled) return `${prefix}-gray-${suffix}`;
  if (state === BasicState.loading) return `${prefix}-yellow-${suffix}`;
  if (state === BasicState.error) return `${prefix}-red-${suffix}`;
  return defaultEnabled ? '' : `${prefix}-green-${suffix}`;
};

export const getTokenColor = (token: PromptToken) => {
  let className = '';
  if (token.type === PromptTokenType.Mention) {
    switch (token.state) {
      case PromptTokenState.Error:
        className = 'text-red-400 line-through';
        break;
      case PromptTokenState.Editing:
        className = 'text-gray-400 animate-pulse';
        break;
      default:
        className = 'text-blue-400 underline';
    }
  }
  if (token.type === PromptTokenType.Hashtag) className = 'text-yellow-400';
  return className;
};
