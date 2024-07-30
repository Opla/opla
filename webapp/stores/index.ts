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

import { create } from 'zustand';
import {
  Assistant,
  Conversation,
  Message,
  ConversationMessages,
  Preset,
  Provider,
  Settings,
  AIService,
  ModelsConfiguration,
} from '@/types';
import logger from '@/utils/logger';
import { mapKeys } from '@/utils/data';
import { toCamelCase } from '@/utils/string';
import createAssistantSlice, { AssistantSlice } from './assistant';
import createWorkspaceSlice, { WorkspaceSlice } from './workspace';
import { EVENTS, Emitter, GlobalAppState, StorageState } from './types';
import createThreadSlice, { ThreadSlice } from './thread';
import createPresetSlice, { PresetSlice } from './preset';
import createProviderSlice, { ProviderSlice } from './provider';
import createSettingsSlice, { SettingsSlice } from './settings';
import createServiceSlice, { ServiceSlice } from './service';
import createModelSlice, { ModelSlice } from './model';
import createUsageSlice, { UsageSlice } from './usage';

type PaylLoadValue = string | number | undefined;

type PayloadEmitter = {
  key: number;
  value: PaylLoadValue;
};

const emit: Emitter = async (key: number, value: PaylLoadValue) => {
  const { emit: emitStateEvent } = await import('@tauri-apps/api/event');
  emitStateEvent(EVENTS.STATE_CHANGE_EVENT, {
    key,
    value,
  });
};

export const useSettingsStore = create<SettingsSlice>()((...a) => ({
  ...createSettingsSlice(emit)(...a),
}));

export const useModelsStore = create<ModelSlice>()((...a) => ({
  ...createModelSlice(emit)(...a),
}));

export const useServiceStore = create<ServiceSlice>()((...a) => ({
  ...createServiceSlice(emit)(...a),
}));

export const useAssistantStore = create<AssistantSlice>()((...a) => ({
  ...createAssistantSlice(emit)(...a),
}));

export const useWorkspaceStore = create<WorkspaceSlice>()((...a) => ({
  ...createWorkspaceSlice(emit)(...a),
}));

export const useThreadStore = create<ThreadSlice>()((...a) => ({
  ...createThreadSlice(emit)(...a),
}));

export const usePresetStore = create<PresetSlice>()((...a) => ({
  ...createPresetSlice(emit)(...a),
}));

export const useProviderStore = create<ProviderSlice>()((...a) => ({
  ...createProviderSlice(emit)(...a),
}));

export const useUsageStorage = create<UsageSlice>()((...a) => ({
  ...createUsageSlice(emit)(...a),
}));

export const subscribeStateSync = async () => {
  const { listen } = await import('@tauri-apps/api/event');
  const unsubscribeStateSyncListener = await listen(EVENTS.STATE_SYNC_EVENT, async (event) => {
    const { key, value } = event.payload as PayloadEmitter;
    logger.info(`State event: ${event}`, key, value);
    if (key === GlobalAppState.WORKSPACE) {
      const { workspaces } = useWorkspaceStore.getState();
      workspaces[key] = await mapKeys(value, toCamelCase);
      useWorkspaceStore.setState({ workspaces, state: StorageState.OK, error: undefined });
    } else if (key === GlobalAppState.PROJECT) {
      const { projects } = useWorkspaceStore.getState();
      projects[key] = await mapKeys(value, toCamelCase);
      useWorkspaceStore.setState({ projects, state: StorageState.OK, error: undefined });
    } else if (key === GlobalAppState.ALLCONVERSATIONS) {
      const { conversations, archives } = (await mapKeys(value, toCamelCase)) as {
        conversations: Conversation[];
        archives: Conversation[];
      };
      useThreadStore.setState({
        archives,
        conversations,
        state: StorageState.OK,
        error: undefined,
      });
    } else if (key === GlobalAppState.CONVERSATIONS) {
      const conversations = (await mapKeys(value, toCamelCase)) as Conversation[];
      useThreadStore.setState({ conversations, state: StorageState.OK, error: undefined });
    } else if (key === GlobalAppState.ARCHIVES) {
      const archives = (await mapKeys(value, toCamelCase)) as Conversation[];
      useThreadStore.setState({ archives, state: StorageState.OK, error: undefined });
    } else if (key === GlobalAppState.CONVERSATIONMESSAGES) {
      const { conversationId, messages: conversationMessages = [] } = (await mapKeys(
        value,
        toCamelCase,
      )) as ConversationMessages;
      const { messages, messagesState } = useThreadStore.getState();
      useThreadStore.setState({
        messages: { ...messages, [conversationId]: conversationMessages },
        state: StorageState.OK,
        messagesState: { ...messagesState, [conversationId]: StorageState.OK },
        error: undefined,
      });
    } else if (key === GlobalAppState.MESSAGES) {
      const store = useThreadStore.getState();
      const messages = (await mapKeys(value, toCamelCase)) as Record<string, Message[]>;
      useThreadStore.setState({
        messages,
        messagesState: { ...store.messagesState, id: StorageState.OK },
        error: undefined,
      });
    } else if (key === GlobalAppState.PRESETS) {
      const { presets } = (await mapKeys(value, toCamelCase)) as { presets: Preset[] };
      usePresetStore.setState({ presets, state: StorageState.OK, error: undefined });
    } else if (key === GlobalAppState.PROVIDERS) {
      const { providers } = (await mapKeys(value, toCamelCase)) as { providers: Provider[] };
      useProviderStore.setState({ providers, state: StorageState.OK, error: undefined });
    } else if (key === GlobalAppState.ASSISTANTS) {
      const { assistants } = (await mapKeys(value, toCamelCase)) as { assistants: Assistant[] };
      useAssistantStore.setState({ assistants, state: StorageState.OK, error: undefined });
    } else if (key === GlobalAppState.SETTINGS) {
      const { settings } = (await mapKeys(value, toCamelCase)) as { settings: Settings };
      useSettingsStore.setState({ settings, state: StorageState.OK, error: undefined });
    } else if (key === GlobalAppState.SERVICES) {
      const { activeService } = (await mapKeys(value, toCamelCase)) as {
        activeService?: AIService;
      };
      useServiceStore.setState({ activeService, state: StorageState.OK, error: undefined });
    } else if (key === GlobalAppState.MODELS) {
      const { models } = (await mapKeys(value, toCamelCase)) as { models: ModelsConfiguration };
      useModelsStore.setState({ ...models, state: StorageState.OK, error: undefined });
    }
  });

  return unsubscribeStateSyncListener;
};
