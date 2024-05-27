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

import { ConversationPreset, Preset, PresetParameter, Provider } from '@/types';
import { createBaseNamedRecord, deepEqual } from '.';

export const defaultPresets: Preset[] = [
  {
    id: 'opla',
    name: 'Opla',
    readonly: true,
    updatedAt: 0,
    createdAt: 0,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    readonly: true,
    updatedAt: 0,
    createdAt: 0,
  },
  {
    id: 'gpt-3.5',
    parentId: 'openai',
    name: 'ChatGPT-3.5',
    readonly: true,
    updatedAt: 0,
    createdAt: 0,
  },
  {
    id: 'gpt-4',
    parentId: 'openai',
    name: 'ChatGPT-4',
    readonly: true,
    updatedAt: 0,
    createdAt: 0,
  },
];

export const createPreset = (
  name: string,
  parentId: string | undefined,
  template: Partial<Preset>,
) => {
  const preset: Preset = {
    ...template,
    ...createBaseNamedRecord<Preset>(name),
    parentId,
  };
  return preset;
};

export const mergePresets = (presets: Preset[], newPresets: Preset[]) => {
  const newPresetsIds = newPresets.map((p) => p.id);
  const freshNewPresets = newPresets.filter((ps) => !presets.find((p) => p.id === ps.id));
  const mergedPresets = presets.map((ps) => {
    if (newPresetsIds.includes(ps.id)) {
      const updatedPreset = newPresets.find((newPreset) => newPreset.id === ps.id);
      if (!deepEqual(ps, updatedPreset)) {
        return { ...ps, ...updatedPreset, updatedAt: Date.now() };
      }
    }
    return ps;
  });
  return [...mergedPresets, ...freshNewPresets];
};

export const matchModel = (p: Preset, model: string) =>
  model.toLowerCase().indexOf(p.id.toLowerCase()) > -1;

export const matchProvider = (p: Preset, provider: Provider) =>
  provider.name.toLowerCase().indexOf(p.id.toLowerCase()) > -1;

export const findCompatiblePreset = (
  presetId: string | undefined,
  presets: Preset[],
  model?: string,
  provider?: Provider,
) => {
  let compatiblePreset = presets.find((p) => p.id === presetId);
  if (!compatiblePreset) {
    if (model && !compatiblePreset) {
      compatiblePreset = presets.find((p) => matchModel(p, model));
    }
    if (provider && !compatiblePreset) {
      compatiblePreset = presets.find((p) => matchProvider(p, provider));
    }
  }
  return compatiblePreset;
};

export const getCompatiblePresets = (presets: Preset[], model?: string, provider?: Provider) => {
  const compatiblePresets: Record<string, boolean> = {};
  presets.forEach((p) => {
    if (p.parentId) {
      compatiblePresets[p.id] = compatiblePresets[p.parentId];
    }
    if (model) {
      compatiblePresets[p.id] = matchModel(p, model);
    }
    if (provider && !compatiblePresets[p.id]) {
      compatiblePresets[p.id] = matchProvider(p, provider);
    }
  });
  presets.forEach((p) => {
    if (p.parentId && compatiblePresets[p.parentId] && !p.readonly) {
      compatiblePresets[p.id] = true;
    }
  });
  return compatiblePresets;
};

export const isKeepSystem = (preset: Preset | undefined) =>
  typeof preset?.keepSystem === 'boolean' ? preset?.keepSystem : true;

export const mergeParameters = (
  parameters: Record<string, PresetParameter> | undefined,
  newParameters: Record<string, PresetParameter> | undefined,
) => {
  const mergedParameters: Record<string, PresetParameter> = { ...parameters };
  if (newParameters) {
    Object.keys(newParameters).forEach((p) => {
      mergedParameters[p] = newParameters[p];
    });
  }
  return mergedParameters;
};

export const getCompletePresetProperties = (
  _preset: Preset | undefined,
  partialPreset: Partial<Preset & ConversationPreset> | undefined,
  presets: Preset[],
  includeParent = false,
) => {
  const preset = _preset || presets.find((p) => p.id === partialPreset?.preset) || ({} as Preset);
  let { parameters, system, contextWindowPolicy, keepSystem } = preset;
  if (includeParent && preset?.parentId) {
    const parentPreset = presets.find((p) => p.id === preset?.parentId);
    if (parentPreset) {
      parameters = mergeParameters(preset?.parameters, partialPreset?.parameters);
      system = parentPreset?.system ?? preset?.system;
      keepSystem = parentPreset ? isKeepSystem(parentPreset) : keepSystem;
    }
  }
  parameters = mergeParameters(preset?.parameters, partialPreset?.parameters);
  contextWindowPolicy = partialPreset?.contextWindowPolicy || contextWindowPolicy;
  keepSystem = partialPreset ? isKeepSystem(partialPreset as Preset) : keepSystem;
  return { ...preset, parameters, system, contextWindowPolicy, keepSystem };
};
