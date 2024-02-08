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
import { updateConversation } from '@/utils/data/conversations';

export type Context = {
  conversations: Array<Conversation>;
  archives: Array<Conversation>;
  providers: Array<Provider>;
  setConversations: (newConversations: Conversation[]) => void;
  getConversationMessages: (id: string | undefined) => Message[];
  filterConversationMessages: (
    id: string | undefined,
    filter: (m: Message) => boolean,
  ) => Message[];
  updateConversationMessages: (id: string | undefined, messages: Message[]) => void;
  setArchives: (newArchives: Conversation[]) => void;
  setProviders: (newProviders: Provider[]) => void;
  usage: LlmUsage | undefined;
  setUsage: (newUsage: LlmUsage | undefined) => void;
};

const initialContext: Context = {
  conversations: [],
  setConversations: () => {},
  getConversationMessages: () => [],
  filterConversationMessages: () => [],
  updateConversationMessages: () => {},
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

  const getConversationMessages = useCallback(
    (id: string | undefined): Message[] => {
      const messages: Message[] = conversations.find((c) => c.id === id)?.messages || [];
      return messages;
    },
    [conversations],
  );

  const filterConversationMessages = useCallback(
    (id: string | undefined, filter: (msg: Message) => boolean): Message[] => {
      const messages: Message[] = getConversationMessages(id).filter(filter) || [];
      return messages;
    },
    [getConversationMessages],
  );

  const updateConversationMessages = useCallback(
    (id: string | undefined, messages: Message[]) => {
      const conversation = conversations.find((c) => c.id === id);
      if (conversation) {
        conversation.messages = messages;
        setConversations(updateConversation(conversation, conversations));
      }
    },
    [conversations, setConversations],
  );

  const contextValue = useMemo(
    () => ({
      conversations,
      setConversations,
      getConversationMessages,
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
      setConversations,
      getConversationMessages,
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
