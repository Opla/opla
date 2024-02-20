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

import { ZodSchema } from 'zod';
import * as Ui from './ui';

declare global {
  interface Window {
    __TAURI__: {
      convertFileSrc: (src: string, protocol: string) => string;
    };
  }
}

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

export type BaseIdRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Metadata;
};

export type BaseNamedRecord = BaseIdRecord & {
  name: string;
  description?: string;
};

export enum MessageState {
  Pending = 'pending',
  Stream = 'stream',
  Delivered = 'delivered',
  Error = 'error',
}

export enum AssetState {
  Pending = 'pending',
  Downloading = 'downloading',
  Ok = 'Ok',
  Error = 'error',
}

export type Asset = BaseIdRecord & {
  metadata?: Metadata;
  state?: AssetState;
} & (
    | {
        type: 'link';
        url: string;
      }
    | {
        type: 'file';
        file: string;
      }
  );

export type Message = BaseIdRecord & {
  author: Author;
  content: string | Content | undefined;
  contentHistory?: (string | Content)[];
  status?: MessageState;
  sibling?: string;
  conversationId?: string;
  assets?: string[];
};

export type Messages = {
  conversationId: string;
  messages: Message[];
};

export type PresetParameter = string | number | boolean;

export enum ContextWindowPolicy {
  None = 'none',
  Rolling = 'rolling',
  Stop = 'stop',
  Last = 'last',
}

export type Preset = BaseNamedRecord & {
  parentId?: string;
  provider?: string;
  models?: string[];

  readOnly?: boolean;

  system?: string;
  parameters?: Record<string, PresetParameter>;
  contextWindowPolicy?: ContextWindowPolicy;
  keepSystem?: boolean;
};

export type ConversationUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;

  completionMs?: number;
  promptMs?: number;
  totalMs?: number;

  promptPerSecond?: number;
  completionPerSecond?: number;
  totalPerSecond?: number;
};

export type Conversation = BaseNamedRecord & {
  messages: Message[] | undefined;
  pluginIds?: string[];
  preset?: string;
  currentPrompt?: string;
  note?: string;
  model?: string;
  provider?: string;
  importedFrom?: string;
  temp?: boolean;

  usage?: ConversationUsage;

  system?: string;
  parameters?: Record<string, PresetParameter>;
  contextWindowPolicy?: ContextWindowPolicy;
  keepSystem?: boolean;

  scrollPosition?: number;

  assets?: Asset | Asset[];
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

export enum LlmEngine {
  llamacpp = 'llamacpp',
  openai = 'openai',
  unknown = 'unknown',
}

export type ParameterDefinition = {
  z: ZodSchema;
  type?: 'text' | 'password' | 'large-text' | 'number' | 'url' | 'select' | 'boolean';
  defaultValue?: string | number | boolean | undefined;
  min?: number;
  max?: number;
  name: string;
  description: string;
};

export type ParametersDefinition = Record<string, ParameterDefinition>;

export type CompletionParameterDefinition = ParameterDefinition;

export type CompletionParametersDefinition = Record<string, CompletionParameterDefinition>;

export type ProviderDefinition = {
  name: string;
  type: ProviderType;
  description: string;
  system: string;
  template: Partial<Provider>;
  completion: {
    parameters: CompletionParametersDefinition;
    invoke: (
      model: Model | undefined,
      provider: Provider | undefined,
      messages: LlmMessage[],
      system?: string,
      conversationId?: string,
      parameters?: LlmParameters[],
    ) => Promise<LlmResponse>;
  };
};

export type Provider = BaseNamedRecord & {
  url: string;
  docUrl?: string;
  type: ProviderType;
  disabled: boolean;
  key: string;
  models?: Model[];
  errors?: string[];
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
  contextWindow?: number;
  editable?: boolean;
};

export type ModelsCollection = {
  updatedAt: number;
  createdAt: number;
  models: Model[];
};

export type Prompt = BaseNamedRecord & {
  title: string;
  icon?: unknown;
  value: string;
  tags?: string[];
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
  STDOUT = 'stdout',
  STDERR = 'stderr',
}

export type Payload = {
  status: ServerStatus;
  message: string;
};

export type OplaServer = {
  status: ServerStatus;
  message?: string;
  name?: string;
  stdout?: string[];
  stderr?: string[];
};

export type PageSettings = {
  selectedId?: string;
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
  selectedPage?: Ui.Page;
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

export type Assistant = BaseNamedRecord & {};

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

export type LlmParameters = {
  key: string;
  value: string;
};

export type LlmQueryCompletion = {
  conversationId?: string;
  messages: LlmMessage[];
  parameters?: LlmParameters[];
};

export type LlmQuery = {
  command: string;
  options: LlmQueryCompletion;
};

export type LlmUsage = {
  completionTokens?: number;
  promptTokens?: number;
  totalTokens?: number;
  completionMs?: number;
  promptMs?: number;
  totalMs?: number;
  promptPerSecond?: number;
  completionPerSecond?: number;
  totalPerSecond?: number;
};

export type LlmResponse = {
  created?: number;
  status?: string;
  content: string;
  conversationId?: string;
  usage?: LlmUsage;
};

export type LlmStreamResponse = {
  created: number;
  status: string;
  content: string[];
  prevContent?: string;
  conversationId: string;
};

export type Cpu = {
  usage: number;
};

export type Sys = {
  name: string;
  kernelVersion: string;
  osVersion: string;
  cpuArch: string;

  totalMemory: number;
  usedMemory: number;
  totalSwap: number;
  usedSwap: number;

  cpus: Cpu[];
};

export { Ui };
