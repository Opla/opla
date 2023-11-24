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

import { v4 as uuid } from 'uuid';
import { Conversation } from '@/types';
import { SetStateAction, createContext, useState } from 'react';

type Context = {
  conversations: Array<Conversation>;
  setConversations: (newConversations: SetStateAction<Conversation[]>) => void;
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
};

const AppContext = createContext(initialContext);

function AppWrapper({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState(initialContext.conversations);

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <AppContext.Provider value={{ conversations, setConversations }}>
      {children}
    </AppContext.Provider>
  );
}

export { AppContext, AppWrapper };
