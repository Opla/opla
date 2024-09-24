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

import { BasicState } from '@/types/ui';
import { PromptToken, PromptTokenState, PromptTokenType } from '../parsers';

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
  switch (token.state) {
    case PromptTokenState.Error:
      className = 'text-error line-through';
      break;
    case PromptTokenState.Editing:
      className = 'text-gray-500 animate-pulse';
      break;
    case PromptTokenState.Disabled:
      className = 'text-gray-400';
      break;
    case PromptTokenState.Duplicate:
      className = 'text-gray-400 line-through';
      break;
    default:
  }
  if (token.type === PromptTokenType.Mention && className === '') {
    className = 'text-blue-400 underline';
  }
  if (
    (token.type === PromptTokenType.Hashtag || token.type === PromptTokenType.ParameterValue) &&
    className === ''
  )
    className = 'text-yellow-400';
  if (token.type === PromptTokenType.Action && className === '') className = 'text-green-400';
  return className;
};

export type Position2D = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export const EmptyPosition: Position2D = {
  x: -1,
  y: -1,
};

export const getBoundingClientRect = (element?: Element): Rect =>
  element?.getBoundingClientRect() || {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

export const pxValueAsNumber = (px: string, defaultValue: number) => {
  if (px.indexOf('px') !== -1) {
    try {
      return parseInt(px.replace('px', ''), 10);
    } catch (_e) {
      // ignore
    }
  }
  return defaultValue;
};
