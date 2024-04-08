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
import { ParsedPrompt } from '@/utils/parsers';
import * as Ui from './ui';

declare global {
  interface Window {
    __TAURI__: {
      convertFileSrc: (src: string, protocol: string) => string;
    };
  }
}

export type Id = string;

export type BaseIdRecord = {
  id: Id;
  createdAt: number;
  updatedAt: number;
  metadata?: Metadata;
};

export type BaseNamedRecord = BaseIdRecord & {
  name: string;
  description?: string;
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

export enum ContentType {
  Text = 'text',
  /* Image = 'image',
  Video = 'video',
  Audio = 'audio',
  File = 'file',
  Custom = 'custom', */
}

export type ContentFull = {
  type: ContentType;
  parts: string[];
  raw?: string[];
  metadata?: Metadata;
  author?: Author;
};

export type Content = string | ContentFull;

export enum MessageStatus {
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
  content: Content | undefined;
  contentHistory?: Content[];
  status?: MessageStatus;
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

export type InlinePreset = {
  models?: string[];
  provider?: string;
  system?: string;
  parameters?: Record<string, PresetParameter>;
  contextWindowPolicy?: ContextWindowPolicy;
  keepSystem?: boolean;
};

export type Preset = BaseNamedRecord &
  InlinePreset & {
    parentId?: string;
    readonly?: boolean;
    disabled?: boolean;
    selected?: boolean;
  };

export type ConversationPreset = InlinePreset & {
  // For compatibility with Conversation
  // Should be replaced
  preset?: string;
  model?: string;
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

export enum AIServiceType {
  Model = 'model',
  Assistant = 'assistant',
}

export type AIService = {
  disabled?: boolean;
} & (
  | {
      type: AIServiceType.Model;
      modelId: string;
      providerIdOrName?: string;
    }
  | {
      type: AIServiceType.Assistant;
      assistantId: string;
      targetId?: string;
    }
);

export type AIImplService = AIService & {
  model: Model | undefined;
  provider: Provider | undefined;
};

export type Conversation = BaseNamedRecord &
  ConversationPreset & {
    messages: Message[] | undefined;
    pluginIds?: string[];

    currentPrompt?: string | ParsedPrompt;
    note?: string;

    services?: AIService[];

    importedFrom?: string;
    temp?: boolean;

    usage?: ConversationUsage;

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

export type CompletionOptions = {
  contextWindowPolicy?: ContextWindowPolicy;
  keepSystem?: boolean;
  system?: string;
};
export type ImplProvider = {
  name: string;
  type: ProviderType;
  description: string;
  system: string;
  defaultParameters: LlmParameters[];
  template: Partial<Provider>;
  completion: {
    parameters: CompletionParametersDefinition;
  };
  tokenize?: (text: string) => Promise<number[]>;
};

export type Provider = BaseNamedRecord & {
  url: string;
  docUrl?: string;
  type: ProviderType;
  disabled: boolean;
  key: string | undefined;
  models?: Model[];
  errors?: string[];
  metadata?: {
    server: ServerConfiguration;
  };
};

export enum ModelState {
  Pending = 'pending',
  Downloading = 'downloading',
  Ok = 'Ok',
  Error = 'error',
  NotFound = 'not_found',
  Removed = 'removed',
}

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

  state?: ModelState;
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

export type PromptTemplate = BaseNamedRecord & {
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

export type ExplorerGroup = {
  title: string;
  hidden: boolean;
  height: number;
  closed: boolean;
};

export type PageSettings = {
  selectedId?: string;
  explorerHidden: boolean;
  settingsHidden: boolean;
  explorerWidth: number;
  settingsWidth: number;
  explorerGroups?: ExplorerGroup[];
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

export type ServerParameters = {
  [key: string]: string | number | boolean;
};

export type ServerConfiguration = {
  name: string;
  binary?: string;
  parameters: ServerParameters;
};

export type ModelsConfiguration = {
  path?: string;
  items: Array<Model>;
};

export type ServicesConfiguration = {
  activeService?: AIService;
};

export type Avatar = {
  color?: string;
  url?: string;
  name?: string;
};

export type AvatarRef = Avatar & {
  ref: string;
  fallback?: string;
};

export type Agent = BaseNamedRecord & {
  disabled?: boolean;
  avatar?: Avatar;
  parentId?: string;
  version?: string;
  readonly?: boolean;
  system?: string;
  targets?: Preset[];
};

export type Assistant = Agent & {
  title?: string;
  subtitle?: string;
  author?: Entity;
  promptTemplates?: PromptTemplate[];
  featured?: boolean;
  hidden?: boolean;
  tags?: string[];
};

export type Store = {
  settings: Settings;
  server: ServerConfiguration;
  models: ModelsConfiguration;
  services: ServicesConfiguration;
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

export type LlmError = {
  type: 'error';
  message: string;
};

export type LlmCompletionResponse =
  | {
      status: 'success';
      created?: number;
      content: string;
      conversationId?: string;
      usage?: LlmUsage;
    }
  | {
      status: 'finished';
      content: 'done';
      conversationId?: string;
      created: number;
    }
  | {
      status: 'error';
      message: string;
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

export type LlmTokenizeResponse = {
  tokens: number[];
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
