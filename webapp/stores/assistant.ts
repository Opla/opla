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
import { Assistant, Model, Preset } from '@/types';
import { createBaseNamedRecord, createBaseRecord, mapKeys, updateRecord } from '@/utils/data';
import { toSnakeCase } from '@/utils/string';
import { Emitter, GlobalAppState } from './constants';

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
  loadAssistants: () => void;
  getAllAssistants: () => Assistant[];
  getAssistant: (id: string | undefined) => Assistant | undefined;
  createAssistant: (name: string, template?: Partial<Assistant>) => Assistant;
  updateAssistant: (newAssistant: Assistant) => void;
  deleteAssistant: (id: string) => void;
  createTarget: () => Preset;
  updateTarget: (assistant: Assistant, newTarget: Preset) => void;
  deleteTarget: (assistant: Assistant, targetId: string) => void;
  duplicateTarget: (target: Preset) => Preset;
  isModelUsedInAssistants: (model: Model) => boolean;
}

export type AssistantStore = ReturnType<typeof createAssistantSlice>;

const DEFAULT_PROPS: AssistantProps = {
  assistants: [],
};

const createAssistantSlice =
  (emit: Emitter, initProps?: Partial<AssistantSlice>): StateCreator<AssistantSlice> =>
  // emit(GlobalAppState.ASSISTANTS, undefined);
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    loadAssistants: () => {
      emit(GlobalAppState.ASSISTANTS, undefined);
    },
    getAllAssistants: () => [OplaAssistant, ...get().assistants.filter((a) => !a.hidden)],
    getAssistant: (id: string | undefined) =>
      OplaAssistant.id === id ? OplaAssistant : get().assistants.find((a) => a.id === id),
    createAssistant: (name: string, template?: Partial<Assistant>) => {
      const newAssistant = createBaseNamedRecord<Assistant>(name, template);
      // set((state: AssistantSlice) => ({ assistants: [...state.assistants, newAssistant] }));
      const assistants = [...get().assistants, newAssistant];
      set({
        assistants,
      });
      const value = mapKeys({ assistants }, toSnakeCase);
      emit(GlobalAppState.ASSISTANTS, value);
      return newAssistant;
    },
    updateAssistant: (newAssistant: Assistant) => {
      const updatedAssistant: Assistant = updateRecord<Assistant>(newAssistant);
      const assistants = get().assistants.map((a) =>
        a.id === updatedAssistant.id ? updatedAssistant : a,
      );
      set({
        assistants,
      });
      const value = mapKeys({ assistants }, toSnakeCase);
      emit(GlobalAppState.ASSISTANTS, value);
    },
    deleteAssistant: (id: string) => {
      const assistants = get().assistants.filter((a) => a.id !== id);
      set({
        assistants,
      });
      const value = mapKeys({ assistants }, toSnakeCase);
      emit(GlobalAppState.ASSISTANTS, value);
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
      const assistants = get().assistants.map((a) =>
        a.id === updatedAssistant.id ? updatedAssistant : a,
      );
      set({
        assistants,
      });
      const value = mapKeys({ assistants }, toSnakeCase);
      emit(GlobalAppState.ASSISTANTS, value);
    },
    deleteTarget: (assistant: Assistant, targetId: string) => {
      const targets = assistant.targets?.filter((t) => t.id !== targetId);
      const updatedAssistant: Assistant = updateRecord<Assistant>({
        ...assistant,
        targets,
      } as Assistant);
      const assistants = get().assistants.map((a) =>
        a.id === updatedAssistant.id ? updatedAssistant : a,
      );
      set({
        assistants,
      });
      const value = mapKeys({ assistants }, toSnakeCase);
      emit(GlobalAppState.ASSISTANTS, value);
    },
    duplicateTarget: (target: Preset) => {
      const newTarget: Preset = createBaseRecord<Preset>();
      return { ...target, ...newTarget };
    },
    isModelUsedInAssistants: (model: Model) => {
      const { assistants } = get();
      return assistants.some((a) =>
        a.targets?.some((t) =>
          t.models?.some((modelNameId) => modelNameId === model.id || modelNameId === model.name),
        ),
      );
    },
  });
export default createAssistantSlice;
