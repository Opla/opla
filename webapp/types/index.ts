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
  role: 'user' | 'system' | 'assistant' | 'note';
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
  cancelled?: boolean;
  error?: string;
};

export type Content = string | ContentFull;

export enum MessageStatus {
  Pending = 'pending',
  Delivered = 'delivered',
  Error = 'error',
  Stream = 'stream',
}

export enum AssetState {
  Pending = 'pending',
  Downloading = 'downloading',
  Ok = 'Ok',
  Error = 'error',
}

export enum AssetType {
  Link = 'link',
  File = 'file',
}

export type Asset = BaseIdRecord & {
  metadata?: Metadata;
  state?: AssetState;
  tokensCount?: number;
} & (
    | {
        type: AssetType.Link;
        url: string;
      }
    | {
        type: AssetType.File;
        file: string;
        size?: number;
      }
  );

export type Message = BaseIdRecord & {
  author: Author;
  content: Content | undefined;
  contentHistory?: Content[];
  status?: MessageStatus;
  sibling?: string;
  assets?: string[];
};

export type MessageImpl = Message & {
  conversationId?: string;
  status?: MessageStatus;
  copied?: boolean;
  last?: boolean;
};

export type ConversationMessages = {
  conversationId: string;
  messages: Message[];
};

export type PresetParameter = string | number | boolean | undefined;

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
  services?: AIService[];

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

    importedFrom?: string;
    temp?: boolean;

    usage?: ConversationUsage;

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

export type ParameterDefinitionType =
  | 'text'
  | 'password'
  | 'large-text'
  | 'number'
  | 'url'
  | 'file'
  | 'path'
  | 'select'
  | 'boolean'
  | 'array';

export type ParameterDefinition = {
  z: ZodSchema;
  type?: ParameterDefinitionType;
  defaultValue?: string | number | boolean | undefined;
  min?: number;
  max?: number;
  name: string;
  label?: string;
  description?: string;
  disabled?: boolean;
};

export type ParameterDefinitions = Record<string, ParameterDefinition>;

export type CompletionParameterDefinition = ParameterDefinition;

export type CompletionParameterDefinitions = Record<string, CompletionParameterDefinition>;

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
    parameters: CompletionParameterDefinitions;
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
  Ok = 'ok',
  Error = 'error',
  NotFound = 'not_found',
  Removed = 'removed',
}

export type Model = BaseNamedRecord & {
  baseModel?: string;
  title?: string;
  description?: string;
  summary?: string;
  version?: string;
  icon?: Logo;
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
  sha?: string;
  fileSize?: number;

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
  chatTemplate?: string;
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

export type ViewSettings = {
  selectedId?: string;
  id?: string;
  explorerHidden: boolean;
  settingsHidden: boolean;
  explorerWidth: number;
  settingsWidth: number;
  explorerGroups?: ExplorerGroup[];
  scrollPosition?: number;
};

export type PageSettings = ViewSettings & {
  views?: ViewSettings[];
};

export type Settings = {
  startApp: boolean;
  welcomeSplash: boolean;
  language?: string;
  window?: {
    width: number;
    height: number;
    fullscreen: boolean;
  };
  selectedPage?: Ui.Page;
  pages?: Record<string, PageSettings>;
};

export type ServerParameters = {
  [key: string]: string | number | boolean | ServerParameters | undefined;
};

export type ServerConfiguration = {
  name: string;
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

export type Logo = Avatar;

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
  // settings: Settings;
  server: ServerConfiguration;
  // models: ModelsConfiguration;
  // services: ServicesConfiguration;
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

export type Streams = Record<string, LlmStream>;

export type OplaContext = Readonly<{
  server: OplaServer;
  // config: Store;
  downloads?: Download[];
  streams?: Streams;
}>;

export type LlmMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export type LlmMessage = {
  role: LlmMessageRole;
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

export type LlmCommon = {
  created: number;
  conversationId: string;
  messageId: string;
  usage?: LlmUsage;
};

export type LlmPayload = LlmCommon & {
  status: 'success' | 'finished' | 'cancel';
  content: string;
};

export type LlmStream = LlmCommon & {
  status: 'success' | 'finished' | 'cancel' | 'error';
  content: string[];
  prevContent?: string;
};

export type LlmTokenizeResponse = {
  tokens: number[];
};

export type LlmImageGenerationResponse = {
  images: string[];
};

export type LlmModelsResponse = {
  models: Model[];
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
  globalCpuPercentage: number;
};

export type Usage = {
  conversationId?: string;
  text?: string;
  tokenCount: number;
  activeService?: AIImplService;
};

export type QueryResultEntry = {
  id: string; // EQ message.id
  index: number;
  match: string;
  previousText: string; // max 20
  afterText: string; // max 20
};

export type QueryResult = {
  id: string; // EQ conversation.id
  name: string; // EQ conversation.name
  entries: QueryResultEntry[];
};

export type QueryResponse = {
  results: QueryResult[];
  count: number;
};

export type Workspace = BaseNamedRecord & {
  organizationIdOrName?: string;
  projectsPath: string[];
};

export type Project = BaseNamedRecord & {
  workspaceId: string;
  path: string;
};

export { Ui };
