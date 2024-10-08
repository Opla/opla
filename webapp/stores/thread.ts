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
import { Conversation, Message, QueryResponse, QueryResult, QueryResultEntry } from '@/types';
import { deleteUnusedConversationsDir } from '@/utils/backend/tauri';
import logger from '@/utils/logger';
import { deepCopy, mapKeys } from '@/utils/data';
import { toSnakeCase } from '@/utils/string';
import {
  loadConversationMessages,
  removeConversationMessages,
  saveConversationMessages,
} from '@/utils/backend/commands';
import { hasNewMessages, getMessageContentAsString, mergeMessages } from '@/utils/data/messages';
import {
  deepEqualConversations,
  getConversation,
  removeConversation,
  updateOrCreateConversation,
} from '@/utils/data/conversations';
import { Emitter, GlobalAppState, StateEvent, StorageProps, StorageState } from './types';

interface ThreadProps extends StorageProps {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  messagesState: Record<string, StorageState>;
  archives: Conversation[];
}

export interface ThreadSlice extends ThreadProps {
  isLoading: () => boolean;
  loadAllConversations: (force?: boolean) => void;
  getConversation: (id?: string) => Conversation | undefined;
  setConversations: (newConversations: Conversation[]) => void;
  deleteConversation: (
    id: string,
    deleteFiles: boolean,
    cleanup?: (conversation: Conversation, conversations: Conversation[]) => Promise<void>,
  ) => Promise<void>;
  loadConversationMessages: (key: string, defaultValue: Message[]) => boolean;
  isConversationMessagesLoaded: (id: string) => boolean;
  filterConversationMessages: (
    id: string | undefined,
    filter: (m: Message) => boolean,
  ) => Message[];
  updateConversations: (
    updatedConversations: Conversation[],
    needToUpdateMessages?: boolean,
  ) => Promise<void>;
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
  state: StorageState.INIT,
  conversations: [],
  messages: {},
  messagesState: {},
  archives: [],
};

const createThreadSlice =
  (emit: Emitter, initProps?: Partial<ThreadSlice>): StateCreator<ThreadSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    isLoading: () => get().state === StorageState.INIT || get().state === StorageState.LOADING,
    loadAllConversations: (force = false) => {
      if (get().state === StorageState.INIT || force) {
        set({ ...get(), state: StorageState.LOADING });
        emit(StateEvent.THREAD, GlobalAppState.ALLCONVERSATIONS);
      }
    },
    getConversation: (id) =>
      id ? get().conversations.find((conversation) => conversation.id === id) : undefined,
    setConversations: (newConversations) => {
      if (!deepEqualConversations(newConversations, get().conversations)) {
        const data = mapKeys({ conversations: newConversations }, toSnakeCase);
        emit(StateEvent.THREAD, GlobalAppState.CONVERSATIONS, data);
      }
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
        await emit(StateEvent.THREAD, GlobalAppState.DELETECONVERSATION, id);
        // Delete any orphans messages
        await removeConversationMessages(id);
        await cleanup?.(
          conversation,
          get().conversations.filter((c) => c.id !== id),
        );

        if (deleteFiles) {
          await deleteUnusedConversationsDir(get().conversations.map((c) => c.id));
        }
      }
    },
    isConversationMessagesLoaded: (id: string) => !!get().messages[id],
    loadConversationMessages: (id: string) => {
      const store = get();
      if (store.messagesState[id] === StorageState.LOADING) {
        return false;
      }
      logger.info('loadConversationMessage', id, store.messagesState[id], store.messages[id]);
      set({
        ...store,
        messagesState: { ...store.messagesState, [id]: StorageState.LOADING },
      });
      const value = mapKeys({ conversationId: id }, toSnakeCase);
      emit(StateEvent.THREAD, GlobalAppState.CONVERSATIONMESSAGES, value);
      return true;
    },
    filterConversationMessages: (
      id: string | undefined,
      filter: (msg: Message) => boolean,
    ): Message[] => {
      const newMessages: Message[] = id ? get().messages[id].filter(filter) : [];
      return newMessages;
    },
    updateConversationMessages: async (
      id: string | undefined,
      updatedMessages: Message[],
    ): Promise<void> => {
      if (
        get().state !== StorageState.LOADING &&
        id &&
        !hasNewMessages(get().messages[id], updatedMessages)
      ) {
        set({ state: StorageState.LOADING });
        await saveConversationMessages(id, deepCopy<Message[]>(updatedMessages));
      }
    },
    searchConversationMessages: async (query: string): Promise<QueryResponse> => {
      const result: QueryResponse = {
        count: 0,
        results: [],
      };
      const promises: Promise<void>[] = [];
      const filteredQuery = query.toUpperCase();
      get().conversations.forEach((c) => {
        const search = async (conversation: Conversation) => {
          const group: QueryResult = {
            id: conversation.id,
            name: conversation.name || 'Conversation',
            entries: [],
          };
          let updatedMessages = get().messages[conversation.id];
          if (!updatedMessages) {
            updatedMessages = await loadConversationMessages(conversation.id, false);
          }
          updatedMessages.forEach((message) => {
            const text = getMessageContentAsString(message);
            const index = text.toUpperCase().indexOf(filteredQuery);
            if (index !== -1) {
              result.count += 1;
              let length = 40;
              if (filteredQuery.length > 40) {
                length = 10;
              }
              const previousLength = index < length ? length - index : length;
              const afterLength =
                index + filteredQuery.length > text.length - length ? text.length - index : length;
              const entry: QueryResultEntry = {
                id: message.id,
                index,
                match: text.substring(index, index + filteredQuery.length),
                previousText: text.substring(index - previousLength, index),
                afterText: text.substring(
                  index + filteredQuery.length,
                  index + filteredQuery.length + afterLength,
                ),
              };
              group.entries.push(entry);
            }
          });
          if (group.entries.length > 0) {
            result.results.push(group);
          }
        };
        promises.push(search(c));
      });
      await Promise.all(promises);
      return result;
    },
    updateConversations: async (
      updatedConversations: Conversation[],
      needToUpdateMessages = true,
    ) => {
      if (needToUpdateMessages) {
        const promises: Promise<void>[] = [];
        const conversationsWithoutMessages: Conversation[] = updatedConversations.map((c) => {
          const { messages: updatedMessages, ...updatedConversation } = c;
          if (updatedMessages) {
            promises.push(get().updateConversationMessages(c.id, updatedMessages));
          }
          return updatedConversation as Conversation;
        });
        await Promise.all(promises);
        get().setConversations(conversationsWithoutMessages);
      } else {
        get().setConversations(updatedConversations);
      }
    },
    updateMessagesAndConversation: async (
      changedMessages: Message[],
      conversationMessages: Message[],
      partialConversation: Partial<Conversation>,
      selectedConversationId: string, // = conversationId,
      selectedConversations = get().conversations,
    ) => {
      const updatedMessages = mergeMessages(conversationMessages, changedMessages);
      const updatedConversations = updateOrCreateConversation(
        selectedConversationId,
        selectedConversations,
        partialConversation,
        getMessageContentAsString(conversationMessages?.[0]),
      );
      await get().updateConversations(updatedConversations);
      await get().updateConversationMessages(selectedConversationId, updatedMessages);

      const updatedConversationId = selectedConversationId;
      const updatedConversation = getConversation(
        updatedConversationId,
        updatedConversations,
      ) as Conversation;
      return { updatedConversation, updatedConversations, updatedMessages };
    },
    deleteConversationMessages: async (conversationId: string) => {
      await removeConversationMessages(conversationId);
    },
    setArchives: (newArchives) => {
      const data = mapKeys({ conversations: newArchives }, toSnakeCase);
      emit(StateEvent.THREAD, GlobalAppState.ARCHIVES, data);
    },
    deleteArchive: async (id: string, cleanup?: (id: string) => Promise<void>) => {
      const updatedArchives = removeConversation(id, get().archives);
      const data = mapKeys(updatedArchives, toSnakeCase);
      emit(StateEvent.THREAD, GlobalAppState.ARCHIVES, data);
      return cleanup?.(id);
    },
  });

export default createThreadSlice;
