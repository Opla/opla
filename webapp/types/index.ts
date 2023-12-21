// Copyright 2023 Mik Bry
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

declare global {
  interface Window {
    __TAURI__: any;
  }
}

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

export type Entity = {
  name: string;
  email?: string;
  url?: string;
};

export type Resource = {
  name: string;
  url?: string;
};

export interface Model extends BaseNamedRecord {
  base_model?: string;
  title?: string;
  description?: string;
  summary?: string;
  version?: string;
  creator?: string;
  author?: Entity | string;
  publisher?: Entity | string;
  license?: Entity | string;
  languages?: string | string[];
  tags?: string[];
  recommendations?: string;
  recommended?: boolean;
  featured?: boolean;
  deprecated?: boolean;
  private?: boolean;

  modelType?: string;
  library?: string;
  tensorType?: string;
  quantization?: string;
  bits?: number;
  size?: number;
  maxRam?: number;

  repository?: Resource | string;
  download?: Resource | string;
  documentation?: Resource | string;
  paper?: Resource | string;

  path?: Resource | string; // local path
  fileName?: string; // local file name : deprecated

  include?: Model[];
}

export type ProviderType = 'opla' | 'server' | 'api' | 'proxy';

export interface Provider extends BaseNamedRecord {
  url: string;
  docUrl?: string;
  type: ProviderType;
  disabled: boolean;
  token: string;
  isDisabled?: () => boolean;
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

export enum ServerStatus {
  INIT = 'init',
  WAIT = 'wait',
  STARTING = 'starting',
  STARTED = 'started',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export type Payload = {
  status: ServerStatus;
  message: string;
};

export type OplaServer = {
  status: ServerStatus;
  message?: string;
  name?: string;
  stout?: string[];
  sterr?: string[];
};

export type Settings = {
  startApp: boolean;
  welcomeSplash: boolean;
};

export type ServerConfiguration = {
  name: string;
  binary?: string;
  parameters: { [key: string]: string | number | boolean };
};

export type ModelsConfiguration = {
  defaultModel: string;
  path?: string;
  items: Array<Model>;
};

export type Store = {
  settings: Settings;
  server: ServerConfiguration;
  models: ModelsConfiguration;
};

export type OplaContext = {
  server: OplaServer;
  config: Store;
};
