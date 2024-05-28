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

import { useEffect, useState } from 'react';
// import EmptyView from '@/components/common/EmptyView';
// import useTranslation from '@/hooks/useTranslation';
import { KeyedScrollPosition } from '@/hooks/useScroll';
// import Opla from '@/components/icons/Opla';
import { AvatarRef, Conversation, Message, MessageImpl, PromptTemplate, Ui } from '@/types';
// import logger from '@/utils/logger';
import useBackend from '@/hooks/useBackendContext';
import { MenuAction, Page, ViewName } from '@/types/ui';
import logger from '@/utils/logger';
import ConversationList from './ConversationList';
// import PromptsGrid from './PromptsGrid';
import { useConversationContext } from './ConversationContext';
import { usePromptContext } from '../Prompt/PromptContext';
import Onboarding from './Onboarding';

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
  const { config, setSettings } = useBackend();
  const {
    selectedMessageId,
    handleResendMessage,
    handleChangeMessageContent,
    handleStartMessageEdit,
    handleCancelSending,
  } = useConversationContext();
  const { selectTemplate } = usePromptContext();
  const [update, setUpdate] = useState<{
    name?: string | undefined;
    scrollPosition?: number | undefined;
  }>({});

  const getSelectedViewName = (selectedThreadId: string | undefined, view = ViewName.Recent) =>
    `${view === ViewName.Recent ? Page.Threads : Page.Archives}${selectedThreadId ? `/${selectedThreadId}` : ''}`;

  const pagesSettings = config.settings.pages;
  const conversationId = selectedConversation?.id;
  const conversationViewName = getSelectedViewName(conversationId);
  const conversationSettings = pagesSettings?.[conversationViewName];
  useEffect(() => {
    const afunc = async () => {
      const prevScrollPosition =
        conversationSettings?.scrollPosition === undefined ||
        conversationSettings?.scrollPosition === null ||
        conversationSettings.scrollPosition === -1
          ? undefined
          : +conversationSettings.scrollPosition;
      const scrollPosition =
        update.scrollPosition === undefined ||
        update.scrollPosition === null ||
        update.scrollPosition === -1
          ? undefined
          : +(update.scrollPosition * 1000).toFixed(0);
      if (
        conversationSettings &&
        conversationViewName === update.name &&
        scrollPosition !== prevScrollPosition
      ) {
        logger.info(
          'save ScrollPosition',
          update,
          conversationViewName,
          scrollPosition,
          conversationSettings?.scrollPosition,
        );
        setSettings({
          ...config.settings,
          pages: {
            ...pagesSettings,
            [conversationViewName]: { ...conversationSettings, scrollPosition },
          },
        });
      }
    };
    afunc();
  }, [
    conversationViewName,
    conversationSettings,
    pagesSettings,
    setSettings,
    update,
    config.settings,
  ]);

  const handleScrollPosition = ({ key, position }: KeyedScrollPosition) => {
    const name = getSelectedViewName(key);
    // TODO debug
    const { scrollPosition } = update;
    const py = +position.y.toFixed(2);
    // logger.info('handleScrollPosition', update, name, scrollPosition, position.y);
    if (update.name !== name || update.scrollPosition !== py) {
      logger.info('setUpdate', scrollPosition, py);
      setUpdate({ scrollPosition: py, name });
    }
  };

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
      {messages && messages[0]?.conversationId === conversationId && (
        <ConversationList
          conversation={selectedConversation}
          selectedMessageId={selectedMessageId}
          scrollPosition={
            conversationSettings && conversationSettings.scrollPosition !== undefined
              ? conversationSettings.scrollPosition / 1000
              : undefined
          }
          messages={messages || []}
          avatars={avatars}
          onScrollPosition={handleScrollPosition}
          onResendMessage={handleResendMessage}
          onDeleteMessage={onDeleteMessage}
          onDeleteAssets={onDeleteAssets}
          onChangeMessageContent={handleChangeMessageContent}
          onStartMessageEdit={handleStartMessageEdit}
          onCopyMessage={onCopyMessage}
          onCancelSending={handleCancelSending}
        />
      )}
      <div className="flex flex-col items-center text-sm" />
    </>
  );
}
export { ConversationList };
