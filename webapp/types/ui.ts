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

import { ShortcutIds } from '@/hooks/useShortcuts';
import { LucideIcon } from 'lucide-react';
import React, { type JSX } from 'react';

export enum BasicState {
  disabled = 'disabled',
  loading = 'loading',
  error = 'error',
  active = 'active',
}

// Ui types
export type Item = {
  name: string;
  href?: string;
  page?: string;
  icon?: LucideIcon;
  renderIcon?: () => React.ReactElement<any>;
  items?: Array<Item>;
  flex?: number;
  hidden?: boolean;
  modal?: boolean;
  shortcut?: ShortcutIds;
  target?: boolean;
};

export type MenuItemState = BasicState;

export type MenuItem = {
  key?: string;
  variant?: 'link' | 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  label: string;
  value?: string;
  group?: string;
  icon?: LucideIcon | React.Component;
  renderIcon?: () => JSX.Element;
  selected?: boolean;
  onSelect?: (data: string) => void;
  state?: MenuItemState;
  disabled?: boolean;
  className?: string;
  description?: string;
};

export enum MenuAction {
  ArchiveConversation = 'archive-conversation',
  UnarchiveConversation = 'unarchive-conversation',
  DeleteConversation = 'delete-conversation',
  ChangeView = 'change-view',
  ToggleGroup = 'toggle-group',
  ChooseAssistant = 'choose-assistant',
  InstallModel = 'install-model',
  ConfigureOpenAI = 'configure-openai',
}

export enum ViewName {
  Assistants = 'assistants',
  Recent = 'recent',
  Archives = 'archives',
}

export enum Page {
  Threads = '/threads',
  Archives = '/archives',
  Assistants = '/assistants',
  Models = '/models',
  Providers = '/providers',
  Store = '/threads/store',
}

export enum ModalIds {
  Settings = 'settings',
  Shortcuts = 'shortcuts',
  NewProvider = 'newprovider',
  NewLocalModel = 'newlocalmodel',
  Welcome = 'welcome',
  OpenAI = 'openai',
  CloudModels = 'cloudmodels',
  InspectModel = 'inspectmodel',
  DeleteItem = 'deleteitem',
  DownloadItem = 'downloaditem',
  Downloads = 'downloads',
  NewPreset = 'newpreset',
  EditTarget = 'edittarget',
}

export type ConversationError = {
  id: string;
  conversationId: string;
  message: string;
};
