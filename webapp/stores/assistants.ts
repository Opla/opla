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
import { Assistant, Preset } from '@/types';
import { createBaseNamedRecord, createBaseRecord, updateRecord } from '@/utils/data';

interface AssistantProps {
  assistants: Assistant[];
}

export const OplaAssistant: Assistant = {
  id: 'opla-assistant',
  name: 'Opla',
  disabled: false,
  targets: [],
  createdAt: 0,
  updatedAt: 0,
};

export interface AssistantSlice extends AssistantProps {
  getAllAssistants: () => Assistant[];
  getAssistant: (id: string | undefined) => Assistant | undefined;
  createAssistant: (name: string, template?: Partial<Assistant>) => Assistant;
  updateAssistant: (newAssistant: Assistant) => void;
  deleteAssistant: (id: string) => void;
  createTarget: () => Preset;
  updateTarget: (assistant: Assistant, newTarget: Preset) => void;
  deleteTarget: (assistant: Assistant, targetId: string) => void;
  duplicateTarget: (target: Preset) => Preset;
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
    getAllAssistants: () => [OplaAssistant, ...get().assistants.filter((a) => !a.hidden)],
    getAssistant: (id: string | undefined) =>
      OplaAssistant.id === id ? OplaAssistant : get().assistants.find((a) => a.id === id),
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
    createTarget: (template?: Partial<Assistant>) => {
      const newTarget: Preset = createBaseRecord<Preset>(template);
      return newTarget;
    },
    updateTarget: (assistant: Assistant, newTarget: Preset) => {
      const updatedTarget: Preset = updateRecord<Preset>(newTarget);
      let targets = assistant.targets || [];
      if (targets.find((t) => t.id === updatedTarget.id)) {
        targets = targets.map((t) => (t.id === updatedTarget.id ? updatedTarget : t));
      } else {
        targets = [...targets, updatedTarget];
      }
      const updatedAssistant: Assistant = updateRecord<Assistant>({
        ...assistant,
        targets,
      } as Assistant);
      set((state: AssistantSlice) => ({
        assistants: state.assistants.map((a) =>
          a.id === updatedAssistant.id ? updatedAssistant : a,
        ),
      }));
    },
    deleteTarget: (assistant: Assistant, targetId: string) => {
      const targets = assistant.targets?.filter((t) => t.id !== targetId);
      const updatedAssistant: Assistant = updateRecord<Assistant>({
        ...assistant,
        targets,
      } as Assistant);
      set((state: AssistantSlice) => ({
        assistants: state.assistants.map((a) =>
          a.id === updatedAssistant.id ? updatedAssistant : a,
        ),
      }));
    },
    duplicateTarget: (target: Preset) => {
      const newTarget: Preset = createBaseRecord<Preset>();
      return { ...target, ...newTarget };
    },
  });

export default createAssistantSlice;
