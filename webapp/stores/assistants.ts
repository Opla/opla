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
import { createBaseNamedRecord, updateRecord } from '@/utils/data';

interface AssistantProps {
  assistants: Assistant[];
}

export interface AssistantSlice extends AssistantProps {
  getAssistant: (id: string | undefined) => Assistant | undefined;
  createAssistant: (name: string, template?: Partial<Assistant>) => Assistant;
  updateAssistant: (newAssistant: Assistant) => void;
  deleteAssistant: (id: string) => void;
}

export type AssistantStore = ReturnType<typeof createAssistantSlice>;

const DEFAULT_PROPS: AssistantProps = {
  assistants: [],
};

const createAssistantSlice =
  (initProps?: Partial<AssistantSlice>): StateCreator<AssistantSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    getAssistant: (id: string | undefined) => get().assistants.find((a) => a.id === id),
    createAssistant: (name: string, template?: Partial<Assistant>) => {
      const newAssistant = createBaseNamedRecord<Assistant>(name, template);
      set((state: AssistantSlice) => ({ assistants: [...state.assistants, newAssistant] }));
      return newAssistant;
    },
    updateAssistant: (newAssistant: Assistant) => {
      const updatedAssistant: Assistant = updateRecord<Assistant>(newAssistant);
      set((state: AssistantSlice) => ({
        assistants: state.assistants.map((a) =>
          a.id === updatedAssistant.id ? updatedAssistant : a,
        ),
      }));
    },
    deleteAssistant: (id: string) => {
      set((state: AssistantSlice) => ({ assistants: state.assistants.filter((a) => a.id !== id) }));
    },
  });

export default createAssistantSlice;
