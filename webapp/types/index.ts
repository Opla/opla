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

import { LucideIcon } from 'lucide-react';
import { ZodSchema } from 'zod';

declare global {
  interface Window {
    __TAURI__: any;
  }
}

// Ui types
export type Item = {
  name: string;
  href?: string;
  page?: string;
  icon?: LucideIcon;
  items?: Array<Item>;
  flex?: number;
  hidden?: boolean;
  modal?: boolean;
  shortcut?: string;
};

export type MenuItem = {
  variant?: 'link' | 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  label: string;
  value?: string;
  group?: string;
  icon?: unknown;
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

export type BaseNamedRecord = BaseRecord & {
  name: string;
  description?: string;
};

export type Message = BaseRecord & {
  author: Author;
  content: string | Content;
  contentHistory?: (string | Content)[];
};

export type Conversation = BaseNamedRecord & {
  messages: Message[];
  pluginIds?: string[];
  preset?: Preset;
  currentPrompt?: string;
  note?: string;
  system?: string;
  model?: string;
  provider?: string;
  importedFrom?: string;
  temp?: boolean;
};

export type Entity = {
  name: string;
  email?: string;
  url?: string;
};

export type Resource = {
  name: string;
  url?: string;
};

export enum ProviderType {
  opla = 'opla',
  server = 'server',
  openai = 'openai',
  proxy = 'proxy',
}

export type ProviderObject = {
  name: string;
  type: ProviderType;
  description: string;
  system: string;
  template: Partial<Provider>;
  completion: {
    presetKeys: Record<string, string>;
    schema: ZodSchema;
    invoke: (
      model: Model | undefined,
      provider: Provider | undefined,
      messages: LlmMessage[],
      system?: string,
      properties?: Partial<LlmQueryCompletion>,
    ) => Promise<string>;
  };
};

export type Provider = BaseNamedRecord & {
  url: string;
  docUrl?: string;
  type: ProviderType;
  disabled: boolean;
  key: string;
  models?: Model[];
  isDisabled?: () => boolean;
};

export type Model = BaseNamedRecord & {
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
  fileName?: string; // local file name
  provider?: string; // provider id or name

  include?: Model[];

  system?: string;
};

export type Preset = BaseNamedRecord & {
  title: string;
  ownerId?: string;
  parentId?: string;
  providerId?: string;
  modelIds?: string[];
};

export type Prompt = BaseNamedRecord & {
  title: string;
  icon?: unknown;
  value: string;
  tags?: string[];
  temperature?: number;
  nPredict?: number;
  stop?: string[];
};

export type Plugin = BaseNamedRecord & {};

export type User = {
  id: string;
  name: string;
  avatarUrl?: string;
  metadata?: Metadata;
};

export enum ServerStatus {
  IDLE = 'idle',
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

export type PageSettings = {
  explorerHidden: boolean;
  settingsHidden: boolean;
  explorerWidth: number;
  settingsWidth: number;
};

export type Settings = {
  startApp: boolean;
  welcomeSplash: boolean;
  window?: {
    width: number;
    height: number;
    fullscreen: boolean;
  };
  selectedPage?: string;
  pages?: Record<string, PageSettings>;
};

export type ServerConfiguration = {
  name: string;
  binary?: string;
  parameters: { [key: string]: string | number | boolean };
};

export type ModelsConfiguration = {
  activeModel: string;
  path?: string;
  items: Array<Model>;
};

export type Store = {
  settings: Settings;
  server: ServerConfiguration;
  models: ModelsConfiguration;
};

export type Download = {
  id: string;
  fileName: string;
  fileSize: number;
  transfered: number;
  transferRate: number;
  percentage: number;
  error?: string;
};

export type OplaContext = Readonly<{
  server: OplaServer;
  config: Store;
  downloads?: Download[];
  streams?: Record<string, LlmStreamResponse>;
}>;

export type LlmMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
};
export type LlmQueryCompletion = {
  messages: LlmMessage[];
  temperature?: number;
  nPredict?: number;
  stop?: string[];
  stream?: boolean;
  conversationId?: string;
};

export type LlmQuery = {
  command: string;
  parameters: LlmQueryCompletion;
};

export type LlmResponse = {
  created: number;
  status: string;
  content: string;
  conversationId: string;
};

export type LlmStreamResponse = {
  created: number;
  status: string;
  content: string[];
  prevContent?: string;
  conversationId: string;
};
