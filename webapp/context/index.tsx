// Copyright 2023 mik
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

import { createContext, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { Conversation, Model, Provider, ProviderType } from '@/types';
import useDataStorage from '@/hooks/useDataStorage';
import { createProvider } from '@/utils/data/providers';
import oplaProviderConfig from '@/utils/providers/opla/config.json';

type Context = {
  conversations: Array<Conversation>;
  providers: Array<Provider>;
  models: Array<Model>;
  setConversations: (newConversations: Conversation[]) => void;
  setProviders: (newProviders: Provider[]) => void;
  setModels: (newModels: Model[]) => void;
};

const initialContext: Context = {
  conversations: [
    {
      id: '1',
      name: 'test',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: '2',
      name: 'another example',
      messages: [
        {
          id: uuid(),
          content: "What's up?",
          author: { role: 'user', name: 'you' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: uuid(),
          content: 'Not much, just chilling.',
          author: { role: 'system', name: 'Llama2' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  setConversations: () => {},
  providers: [
    {
      id: uuid(),
      name: 'Test API',
      type: 'server',
      url: 'http://localhost:3000',
      description: 'A local server for testing purposes. Compatible with OpenAI API.',
      token: 'test',
      disabled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: uuid(),
      name: 'OpenAI API',
      type: 'api',
      url: 'https://api.openai.com/v1',
      description: 'You need an OpenAI API token to use it.',
      docUrl: 'https://platform.openai.com/docs',
      token: 'TODO',
      disabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  setProviders: () => {},
  models: [],
  setModels: () => {},
};

const AppContext = createContext(initialContext);

function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useDataStorage(
    'conversations',
    initialContext.conversations,
  );
  const [providers, setProviders] = useDataStorage('providers', initialContext.providers);
  useEffect(() => {
    let oplaProvider = providers.find((provider) => provider.type === 'opla');
    if (!oplaProvider) {
      const config = { ...oplaProviderConfig, type: oplaProviderConfig.type as ProviderType };
      oplaProvider = createProvider('Opla', config);
      setProviders([oplaProvider, ...providers]);
    }
  }, []);
  const [models, setModels] = useDataStorage('models', initialContext.models);

  return (
    <AppContext.Provider
      // eslint-disable-next-line react/jsx-no-constructed-context-values
      value={{ conversations, setConversations, providers, setProviders, models, setModels }}
    >
      {children}
    </AppContext.Provider>
  );
}

export { AppContext, AppContextProvider };
