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

import { StateCreator } from 'zustand';
import { Assistant } from '@/types';

interface AssistantProps {
  assistants: Assistant[];
}

export interface AssistantSlice extends AssistantProps {
  getAssistant: (id: string | undefined) => Assistant | undefined;
  addAssistant: (newAssistant: Assistant) => void;
}

export type AssistantStore = ReturnType<typeof createAssistantSlice>;

const DEFAULT_PROPS: AssistantProps = {
  assistants: [
    {
      id: '1',
      name: 'Assistant 1',
      description: 'This is the first assistant',
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: '2',
      name: 'Assistant 2',
      description: 'This is the second assistant',
      createdAt: 0,
      updatedAt: 0,
    },
  ],
};

const createAssistantSlice =
  (initProps?: Partial<AssistantSlice>): StateCreator<AssistantSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    getAssistant: (id: string | undefined) => get().assistants.find((a) => a.id === id),
    addAssistant: (newAssistant: Assistant) =>
      set((state: AssistantSlice) => ({ assistants: [...state.assistants, newAssistant] })),
  });

export default createAssistantSlice;
