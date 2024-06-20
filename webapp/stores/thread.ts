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

import { StateCreator } from 'zustand';
import { Conversation, Message, QueryResponse } from '@/types';
import { deleteUnusedConversationsDir } from '@/utils/backend/tauri';
import logger from '@/utils/logger';
import { mapKeys } from '@/utils/data';
import { toSnakeCase } from '@/utils/string';
import { Emitter, GlobalAppState } from './constants';

interface ThreadProps {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  archives: Conversation[];
}

export interface ThreadSlice extends ThreadProps {
  getAllConversations: () => void;
  getConversation: (id?: string) => Conversation | undefined;
  setConversations: (newConversations: Conversation[]) => void;
  deleteConversation: (
    id: string,
    deleteFiles: boolean,
    cleanup?: (conversation: Conversation, conversations: Conversation[]) => Promise<void>,
  ) => Promise<void>;
  readConversationMessages: (key: string, defaultValue: Message[]) => Promise<Message[]>;
  getConversationMessages: (id: string | undefined) => Message[];
  filterConversationMessages: (
    id: string | undefined,
    filter: (m: Message) => boolean,
  ) => Message[];
  updateConversationMessages: (id: string | undefined, messages: Message[]) => Promise<void>;
  updateMessagesAndConversation: (
    changedMessages: Message[],
    conversationMessages: Message[],
    partialConversation: Partial<Conversation>,
    selectedConversationId: string,
    selectedConversations?: Conversation[],
  ) => Promise<{
    updatedConversation: Conversation;
    updatedConversations: Conversation[];
    updatedMessages: Message[];
  }>;
  searchConversationMessages: (query: string) => Promise<QueryResponse>;
  deleteConversationMessages: (conversationId: string) => Promise<void>;
  setArchives: (newArchives: Conversation[]) => void;
  deleteArchive: (id: string, cleanup?: (id: string) => Promise<void>) => Promise<void>;
}

export type ThreadStore = ReturnType<typeof createThreadSlice>;

const DEFAULT_PROPS: ThreadProps = {
  conversations: [],
  messages: {},
  archives: [],
};

const createThreadSlice =
  (emit: Emitter, initProps?: Partial<ThreadSlice>): StateCreator<ThreadSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    getAllConversations: () => {
      emit(GlobalAppState.CONVERSATIONS, {});
      emit(GlobalAppState.ARCHIVES, {});
    },
    getConversation: (id) =>
      id ? get().conversations.find((conversation) => conversation.id === id) : undefined,
    setConversations: (newConversations) => {
      const data = mapKeys(newConversations, toSnakeCase);
      emit(GlobalAppState.CONVERSATIONS, data);
    },
    deleteConversation: async (
      id: string,
      deleteFiles: boolean,
      cleanup?: (conversation: Conversation, conversations: Conversation[]) => Promise<void>,
    ) => {
      const conversation = get().conversations.find((c) => c.id === id) as Conversation;
      if (!conversation) {
        logger.info(`deleteConversation conversation doesn't exist : ${id}`);
      } else {
        await emit(GlobalAppState.DELETECONVERSATION, id);
        // Delete any orphans messages
        // await deleteConversationMessages(id);
        await cleanup?.(
          conversation,
          get().conversations.filter((c) => c.id !== id),
        );

        if (deleteFiles) {
          await deleteUnusedConversationsDir(get().conversations.map((c) => c.id));
        }
      }
    },
    getConversationMessages: () => [],
    readConversationMessages: async () => [],
    filterConversationMessages: () => [],
    updateConversationMessages: async () => {},
    searchConversationMessages: async () => ({ count: 0, results: [] }),
    updateMessagesAndConversation: async () => ({
      updatedConversation: { id: '', createdAt: 0, updatedAt: 0 } as Conversation,
      updatedConversations: [],
      updatedMessages: [],
    }),
    deleteConversationMessages: async (conversationId: string) => {
      logger.info('TODO deleteConversationMessages', conversationId);
    },
    setArchives: (newArchives) => {
      const data = mapKeys(newArchives, toSnakeCase);
      emit(GlobalAppState.ARCHIVES, data);
    },
    deleteArchive: async () => {},
  });

export default createThreadSlice;
