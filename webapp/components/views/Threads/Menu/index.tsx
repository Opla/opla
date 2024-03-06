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

import { ProviderType, Ui } from '@/types';
import { MenuAction } from '@/types/ui';
import ModelMenu from './ModelMenu';
import AssistantMenu from './AssistantMenu';

export type ThreadMenuProps = {
  selectedAssistantId: string | undefined;
  selectedModelName: string;
  selectedConversationId?: string;
  modelItems: Ui.MenuItem[];
  onSelectModel: (model: string, provider: ProviderType) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
};

export default function ThreadMenu({
  selectedAssistantId,
  selectedModelName,
  selectedConversationId,
  modelItems,
  onSelectModel,
  onSelectMenu,
}: ThreadMenuProps) {
  return selectedAssistantId ? (
    <AssistantMenu
      selectedAssistantId={selectedAssistantId}
      selectedConversationId={selectedConversationId}
      onSelectMenu={() => {
        throw new Error('Function not implemented.');
      }}
    />
  ) : (
    <ModelMenu
      selectedModelName={selectedModelName}
      selectedConversationId={selectedConversationId}
      modelItems={modelItems}
      onSelectModel={onSelectModel}
      onSelectMenu={onSelectMenu}
    />
  );
}
