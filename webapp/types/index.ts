// Copyright 2023 mik
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

import { IconType } from 'react-icons';

// Ui types
export type MenuItem = {
  label: string;
  value?: string;
  icon?: IconType;
  selected?: boolean;
  onSelect?: (data: string) => void;
};

// Model types
export type Metadata = {
  [key: string]: string | number | boolean | Metadata;
};

export type Author = {
  role: 'user' | 'system' | 'assistant';
  name: string;
  avatarUrl?: string;
  metadata?: Metadata;
};

export type Content = {
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'custom';
  parts: string[];
  metadata?: Metadata;
};

export type BaseRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Metadata;
};

export interface BaseNamedRecord extends BaseRecord {
  name: string;
  description?: string;
}

export interface Message extends BaseRecord {
  author: Author;
  content: string | Content;
  contentHistory?: (string | Content)[];
}

export interface Conversation extends BaseNamedRecord {
  messages: Message[];
  pluginIds?: string[];
  preset?: Preset;
}

export interface Model extends BaseNamedRecord {
  presetIds?: string[];
}

export type ProviderType = 'opla' | 'server' | 'api' | 'proxy';

export interface Provider extends BaseNamedRecord {
  url: string;
  docUrl?: string;
  type: ProviderType;
  disabled: boolean;
  token: string;
  presetIds?: string[];
}

export interface Preset extends BaseNamedRecord {
  ownerId: string;
  parentId?: string;
  providerId?: string;
  modelIds?: string[];
}

export interface Plugin extends BaseNamedRecord {}

export type User = {
  id: string;
  name: string;
  avatarUrl?: string;
  metadata?: Metadata;
};
