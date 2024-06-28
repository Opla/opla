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

// import { emit as emitStateEvent, listen } from "@tauri-apps/api/event";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Assistant, Conversation, Message, ConversationMessages, Preset } from '@/types';
import logger from '@/utils/logger';
import { mapKeys } from '@/utils/data';
import { toCamelCase } from '@/utils/string';
import createAssistantSlice, { AssistantSlice } from './assistant';
import Storage, { createJSONSliceStorage } from './storage';
import createWorkspaceSlice, { WorkspaceSlice } from './workspace';
import { EVENTS, Emitter, GlobalAppState } from './constants';
import createThreadSlice, { ThreadSlice } from './thread';
import createPresetSlice, { PresetSlice } from './preset';

type PaylLoadValue = string | number | undefined;

type PayloadEmitter = {
  key: number;
  value: PaylLoadValue;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emit: Emitter = async (key: number, value: PaylLoadValue) => {
  const { emit: emitStateEvent } = await import('@tauri-apps/api/event');
  emitStateEvent(EVENTS.STATE_CHANGE_EVENT, {
    key,
    value,
  });
};

export const useAssistantStore = create<AssistantSlice>()(
  persist(
    (...a) => ({
      ...createAssistantSlice()(...a),
    }),
    {
      name: 'assistants',
      storage: createJSONSliceStorage<Assistant>(() => Storage, { space: 2 }),
    },
  ),
);

export const useWorkspaceStore = create<WorkspaceSlice>()((...a) => ({
  ...createWorkspaceSlice(emit)(...a),
}));

export const useThreadStore = create<ThreadSlice>()((...a) => ({
  ...createThreadSlice(emit)(...a),
}));

export const usePresetStore = create<PresetSlice>()((...a) => ({
  ...createPresetSlice(emit)(...a),
}));

export const subscribeStateSync = async () => {
  const { listen } = await import('@tauri-apps/api/event');
  const unsubscribeStateSyncListener = await listen(EVENTS.STATE_SYNC_EVENT, async (event) => {
    const { key, value } = event.payload as PayloadEmitter;
    logger.info(`State event: ${event} ${key} ${value}`);
    if (key === GlobalAppState.WORKSPACE) {
      const { workspaces } = useWorkspaceStore.getState();
      workspaces[key] = await mapKeys(value, toCamelCase);
      useWorkspaceStore.setState({ workspaces });
    } else if (key === GlobalAppState.PROJECT) {
      const { projects } = useWorkspaceStore.getState();
      projects[key] = await mapKeys(value, toCamelCase);
      useWorkspaceStore.setState({ projects });
    } else if (key === GlobalAppState.CONVERSATIONS) {
      const conversations = (await mapKeys(value, toCamelCase)) as Conversation[];
      useThreadStore.setState({ conversations });
    } else if (key === GlobalAppState.ARCHIVES) {
      const archives = (await mapKeys(value, toCamelCase)) as Conversation[];
      useThreadStore.setState({ archives });
    } else if (key === GlobalAppState.CONVERSATIONMESSAGES) {
      const { conversationId, messages: conversationMessages } = (await mapKeys(
        value,
        toCamelCase,
      )) as ConversationMessages;
      const { messages } = useThreadStore.getState();
      useThreadStore.setState({
        messages: { ...messages, [conversationId]: conversationMessages },
      });
    } else if (key === GlobalAppState.MESSAGES) {
      const messages = (await mapKeys(value, toCamelCase)) as Record<string, Message[]>;
      useThreadStore.setState({ messages });
    } else if (key === GlobalAppState.PRESETS) {
      const { presets } = (await mapKeys(value, toCamelCase)) as { presets: Preset[] };
      usePresetStore.setState({ presets });
    }
  });

  return async () => {
    unsubscribeStateSyncListener();
  };
};

export default useAssistantStore;
