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

import { createContext, useMemo, useState } from 'react';
import { Conversation, LlmUsage, Provider } from '@/types';
import useDataStorage from '@/hooks/useDataStorage';

export type Context = {
  conversations: Array<Conversation>;
  archives: Array<Conversation>;
  providers: Array<Provider>;
  setConversations: (newConversations: Conversation[]) => void;
  setArchives: (newArchives: Conversation[]) => void;
  setProviders: (newProviders: Provider[]) => void;
  usage: LlmUsage | undefined;
  setUsage: (newUsage: LlmUsage | undefined) => void;
};

const initialContext: Context = {
  conversations: [],
  setConversations: () => {},
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

  const contextValue = useMemo(
    () => ({
      conversations,
      setConversations,
      archives,
      setArchives,
      providers,
      setProviders,
      usage,
      setUsage,
    }),
    [conversations, setConversations, archives, setArchives, providers, setProviders, usage],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export { AppContext, AppContextProvider };
