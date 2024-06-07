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

import {
  AvatarRef,
  Conversation,
  Message,
  MessageImpl,
  PromptTemplate,
  Ui,
  ViewSettings,
} from '@/types';
import useBackend from '@/hooks/useBackendContext';
import { MenuAction, Page, ViewName } from '@/types/ui';
import { DefaultPageSettings } from '@/utils/constants';
import ConversationList from './ConversationList';
import { usePromptContext } from '../Prompt/PromptContext';
import Onboarding from './Onboarding';
import { ConversationView } from './ConversationView';

export type ConversationPanelProps = {
  selectedConversation: Conversation | undefined;
  selectedAssistantId: string | undefined;
  selectedModelName: string | undefined;
  messages: MessageImpl[] | undefined;
  avatars: AvatarRef[];
  modelItems: Ui.MenuItem[];
  disabled: boolean;
  onDeleteMessage: (m: Message) => void;
  onDeleteAssets: (m: Message) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
  onCopyMessage: (messageId: string, state: boolean) => void;
};

export function ConversationPanel({
  messages,
  avatars,
  selectedConversation,
  selectedAssistantId,
  selectedModelName,
  modelItems,
  disabled,
  onDeleteMessage,
  onDeleteAssets,
  onSelectMenu,
  onCopyMessage,
}: ConversationPanelProps) {
  // const { t } = useTranslation();
  const { config } = useBackend();

  const { selectTemplate } = usePromptContext();

  const getSelectedViewName = (selectedThreadId: string | undefined, view = ViewName.Recent) =>
    `${view === ViewName.Recent ? Page.Threads : Page.Archives}${selectedThreadId ? `/${selectedThreadId}` : ''}`;

  const pagesSettings = config.settings.pages;
  const conversationId = selectedConversation?.id;
  const conversationViewName = getSelectedViewName(conversationId);
  const conversationSettings = pagesSettings?.[conversationViewName];
  const viewSettings: ViewSettings[] = [
    conversationSettings || DefaultPageSettings,
    ...(conversationSettings?.views || []),
  ];

  const handlePromptTemplateSelected = (prompt: PromptTemplate) => {
    selectTemplate(prompt);
  };

  const showEmptyChat = !conversationId || !messages || messages.length === 0;
  if (showEmptyChat) {
    return (
      <Onboarding
        selectedAssistantId={selectedAssistantId}
        selectedModelName={selectedModelName}
        hasModels={modelItems.length > 0}
        disabled={disabled}
        onSelectMenu={onSelectMenu}
        onPromptSelected={handlePromptTemplateSelected}
      />
    );
  }
  return (
    <>
      <div className="flex h-full grow overflow-hidden">
        {viewSettings.map(
          (settings, index) =>
            messages &&
            messages[0]?.conversationId === conversationId &&
            selectedConversation && (
              <ConversationView
                key={`${selectedConversation}-`}
                conversationSettings={settings}
                viewIndex={index}
                selectedConversation={selectedConversation}
                messages={messages || []}
                avatars={avatars}
                onDeleteMessage={onDeleteMessage}
                onDeleteAssets={onDeleteAssets}
                onCopyMessage={onCopyMessage}
              />
            ),
        )}
      </div>

      <div className="flex flex-col items-center text-sm" />
    </>
  );
}
export { ConversationList };
