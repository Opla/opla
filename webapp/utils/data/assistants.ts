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

import { AIService, AIServiceType, Assistant, Ui } from '@/types';

export const getAssistantsAsItems = (assistants: Assistant[], selected?: string): Ui.MenuItem[] =>
  assistants.map(
    (assistant) =>
      ({
        label: assistant.name,
        value: assistant.id,
        icon: assistant.avatar,
        selected: assistant.id === selected,
      }) as Ui.MenuItem,
  );

export const getAssistantTargetsAsItems = (
  assistant: Assistant,
  selected?: string,
): Ui.MenuItem[] =>
  assistant.targets?.map(
    (target) =>
      ({
        label: target.name,
        value: target.id,
        selected: target.id === selected,
        group: target.provider,
      }) as Ui.MenuItem,
  ) ?? [];

export const getDefaultAssistantService = (assistant: Assistant): AIService => ({
  type: AIServiceType.Assistant,
  assistantId: assistant.id,
  targetId: assistant.targets?.[0].id,
});
