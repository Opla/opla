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

import { Fragment, PropsWithChildren } from 'react';

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
import { MenuAction } from '@/types/ui';
import { DefaultPageSettings } from '@/utils/constants';
import { getSelectedViewName } from '@/utils/views';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import ConversationList from './ConversationList';
import { usePromptContext } from '../Prompt/PromptContext';
import Onboarding from './Onboarding';
import { ConversationView } from './ConversationView';

function Group({ viewSettings, children }: PropsWithChildren<{ viewSettings: ViewSettings[] }>) {
  return viewSettings.length < 2 ? (
    <div className="flex h-full grow overflow-hidden">{children}</div>
  ) : (
    <ResizablePanelGroup direction="horizontal" className="flex h-full grow overflow-hidden">
      {children}
    </ResizablePanelGroup>
  );
}
function Panel({
  viewSettings,
  id,
  children,
}: PropsWithChildren<{ viewSettings: ViewSettings[]; id: string }>) {
  return viewSettings.length < 2 ? (
    children
  ) : (
    <ResizablePanel id={id} minSize={10} className="flex grow overflow-hidden">
      {children}
      <ResizableHandle />
    </ResizablePanel>
  );
}

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
  const { settings } = useBackend();

  const { selectTemplate } = usePromptContext();

  const pagesSettings = settings.pages;
  const conversationId = selectedConversation?.id;
  const conversationViewName = getSelectedViewName(conversationId);
  const conversationSettings = pagesSettings?.[conversationViewName];
  const viewSettings: ViewSettings[] = [
    { ...(conversationSettings || DefaultPageSettings), id: '0' },
    ...(conversationSettings?.views?.map((v, index) => ({ id: v.id || `${index + 1}`, ...v })) ||
      []),
  ];

  const handlePromptTemplateSelected = (prompt: PromptTemplate) => {
    selectTemplate(prompt);
  };

  const showEmptyChat = !conversationId || !messages || messages.length === 0;
  console.log('showEmptyChat', showEmptyChat, conversationId, messages);
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
      <Group viewSettings={viewSettings}>
        {viewSettings.map(
          (vsettings, index) =>
            messages &&
            messages[0]?.conversationId === conversationId &&
            selectedConversation && (
              <Panel
                key={`${selectedConversation}-${vsettings.id}`}
                viewSettings={viewSettings}
                id={`${selectedConversation}-${vsettings.id}`}
              >
                <ConversationView
                  key={`${selectedConversation}-${vsettings.id}`}
                  conversationSettings={vsettings}
                  viewIndex={index}
                  selectedConversation={selectedConversation}
                  messages={messages || []}
                  avatars={avatars}
                  onDeleteMessage={onDeleteMessage}
                  onDeleteAssets={onDeleteAssets}
                  onCopyMessage={onCopyMessage}
                />
              </Panel>
            ),
        )}
      </Group>
      <div className="flex flex-col items-center text-sm" />
    </>
  );
}
export { ConversationList };
