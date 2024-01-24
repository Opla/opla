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

import { OplaContext, Preset } from '@/types';
import logger from '../logger';

const getSelectedPreset = (backendContext: OplaContext) => {
  const selectedPreset = `${backendContext.config.server.name}::${backendContext.config.models.activeModel}`;

  logger.warn('getSelectedPreset not implemented');
  return selectedPreset;
};

const getPresets = (backendContext: OplaContext): Preset[] => {
  const presets: Preset[] = backendContext.config.models.items.map((model) => ({
    id: model.id,
    title: model.title || model.name,
    name: `${backendContext.config.server.name}::${model.name}`,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  }));
  return presets;
};

const addPreset = () => {
  logger.warn('addPreset not implemented');
};

export { getSelectedPreset, getPresets, addPreset };
