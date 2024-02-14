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

import { LucideIcon } from 'lucide-react';

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
  items?: Array<Item>;
  flex?: number;
  hidden?: boolean;
  modal?: boolean;
  shortcut?: string;
};

export type MenuItemState = BasicState;

export type MenuItem = {
  variant?: 'link' | 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  label: string;
  value?: string;
  group?: string;
  icon?: unknown;
  selected?: boolean;
  onSelect?: (data: string) => void;
  state?: MenuItemState;
};

export enum MenuAction {
  ArchiveConversation = 'archive-conversation',
  UnarchiveConversation = 'unarchive-conversation',
  DeleteConversation = 'delete-conversation',
  ChangeView = 'change-view',
}

export enum ViewName {
  Recent = 'recent',
  Archives = 'archives',
}

export enum Page {
  Threads = '/threads',
  Archives = '/archives',
  Models = '/models',
  Providers = '/providers',
}

export enum ModalIds {
  Settings = 'settings',
  Shortcuts = 'shortcuts',
  NewProvider = 'newprovider',
  NewLocalModel = 'newlocalmodel',
  Welcome = 'welcome',
  OpenAI = 'openai',
  DeleteItem = 'deleteitem',
  DownloadItem = 'downloaditem',
}
