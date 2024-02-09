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

'use client';

import { createContext, useCallback, useMemo, useState } from 'react';
import { Conversation, LlmUsage, Message, Provider } from '@/types';
import useDataStorage from '@/hooks/useDataStorage';
// import { updateConversation } from '@/utils/data/conversations';
import logger from '@/utils/logger';
import useCollectionStorage from '@/hooks/useCollectionStorage';

export type Context = {
  conversations: Array<Conversation>;
  archives: Array<Conversation>;
  providers: Array<Provider>;
  updateConversations: (newConversations: Conversation[]) => void;
  readConversationMessages: (key: string, defaultValue: Message[]) => Promise<Message[]>;
  getConversationMessages: (id: string | undefined) => Message[];
  filterConversationMessages: (
    id: string | undefined,
    filter: (m: Message) => boolean,
  ) => Message[];
  updateConversationMessages: (id: string | undefined, messages: Message[]) => Promise<void>;
  setArchives: (newArchives: Conversation[]) => void;
  setProviders: (newProviders: Provider[]) => void;
  usage: LlmUsage | undefined;
  setUsage: (newUsage: LlmUsage | undefined) => void;
};

const initialContext: Context = {
  conversations: [],
  updateConversations: () => {},
  getConversationMessages: () => [],
  readConversationMessages: async () => [],
  filterConversationMessages: () => [],
  updateConversationMessages: async () => {},
  archives: [],
  setArchives: () => {},
  providers: [],
  setProviders: () => {},
  usage: undefined,
  setUsage: () => {},
};

const AppContext = createContext(initialContext);

function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<LlmUsage>();
  const [conversations, setConversations] = useDataStorage(
    'conversations',
    initialContext.conversations,
  );
  const [archives, setArchives] = useDataStorage('archives', initialContext.archives);

  const [providers, setProviders] = useDataStorage('providers', initialContext.providers);

  const [getStoredConversationMessages, readStoredConversationMessages, storeConversationMessages] =
    useCollectionStorage<Message[]>('messages');

  const getConversationMessages = useCallback(
    (id: string | undefined): Message[] => {
      const messages: Message[] = id
        ? getStoredConversationMessages(
            id,
            /* conversations.find((c) => c.id === id)?.messages || */ [],
          )
        : [];
      // const messages: Message[] = conversations.find((c) => c.id === id)?.messages || [];
      return messages;
    },
    [getStoredConversationMessages],
  );

  const readConversationMessages = useCallback(
    async (id: string | undefined): Promise<Message[]> => {
      const messages: Message[] = id
        ? await readStoredConversationMessages(
            id,
            /* conversations.find((c) => c.id === id)?.messages || */ [],
          )
        : [];
      // const messages: Message[] = conversations.find((c) => c.id === id)?.messages || [];
      return messages;
    },
    [readStoredConversationMessages],
  );

  const filterConversationMessages = useCallback(
    (id: string | undefined, filter: (msg: Message) => boolean): Message[] => {
      const messages: Message[] = id ? getConversationMessages(id).filter(filter) : [];
      return messages;
    },
    [getConversationMessages],
  );

  const updateConversationMessages = useCallback(
    async (id: string | undefined, messages: Message[]): Promise<void> => {
      // const conversation = conversations.find((c) => c.id === id);
      if (id) {
        /* conversation.messages = messages;
        setConversations(updateConversation(conversation, conversations)); */
        await storeConversationMessages(id, messages);
      }
    },
    [storeConversationMessages],
  );

  const updateConversations = useCallback(
    async (updatedConversations: Conversation[], needToUpdateMessages = true) => {
      // Get deleted conversations and delete their messages
      const deletedConversations = conversations.filter(
        (c) => !updatedConversations.find((uc) => uc.id === c.id),
      );
      if (needToUpdateMessages) {
        const promises: Promise<void>[] = [];
        const conversationsWithoutMessages: Conversation[] = updatedConversations.map((c) => {
          const { messages, ...updatedConversation } = c;
          if (messages) {
            promises.push(updateConversationMessages(c.id, messages));
            // messagesToStore[c.id] = messages;
          }
          return updatedConversation as Conversation;
        });
        await Promise.all(promises);
        setConversations(conversationsWithoutMessages);
      } else {
        setConversations(updatedConversations);
      }
      // TODO delete any orphans messages
      deletedConversations.forEach((c) => {
        logger.info(`TODO Deleting messages for conversation ${c.id}`);
        // deleteMessages(c.id);
      });
    },
    [conversations, setConversations, updateConversationMessages],
  );

  const contextValue = useMemo(
    () => ({
      conversations,
      updateConversations,
      getConversationMessages,
      readConversationMessages,
      filterConversationMessages,
      updateConversationMessages,
      archives,
      setArchives,
      providers,
      setProviders,
      usage,
      setUsage,
    }),
    [
      conversations,
      updateConversations,
      getConversationMessages,
      readConversationMessages,
      filterConversationMessages,
      updateConversationMessages,
      archives,
      setArchives,
      providers,
      setProviders,
      usage,
    ],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export { AppContext, AppContextProvider };
