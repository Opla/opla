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
import { KeyedScrollPosition } from '@/hooks/useScroll';
import { AvatarRef, Conversation, Message, MessageImpl, PageSettings, ViewSettings } from '@/types';
import useBackend from '@/hooks/useBackendContext';
import { Page, ViewName } from '@/types/ui';
import logger from '@/utils/logger';
import { DefaultPageSettings } from '@/utils/constants';
import ConversationList from './ConversationList';
import { useConversationContext } from './ConversationContext';

export type ConversationViewProps = {
  selectedConversation: Conversation;
  conversationSettings: ViewSettings | undefined;
  viewIndex: number;
  messages: MessageImpl[];
  avatars: AvatarRef[];
  onDeleteMessage: (m: Message) => void;
  onDeleteAssets: (m: Message) => void;
  onCopyMessage: (messageId: string, state: boolean) => void;
};

export function ConversationView({
  messages,
  avatars,
  selectedConversation,
  conversationSettings,
  viewIndex,
  onDeleteMessage,
  onDeleteAssets,
  onCopyMessage,
}: ConversationViewProps) {
  // const { t } = useTranslation();
  const { config, setSettings } = useBackend();
  const {
    selectedMessageId,
    handleResendMessage,
    handleChangeMessageContent,
    handleStartMessageEdit,
    handleCancelSending,
  } = useConversationContext();
  const [update, setUpdate] = useState<{
    name?: string | undefined;
    scrollPosition?: number | undefined;
  }>({});

  const getSelectedViewName = (selectedThreadId: string | undefined, view = ViewName.Recent) =>
    `${view === ViewName.Recent ? Page.Threads : Page.Archives}${selectedThreadId ? `/${selectedThreadId}` : ''}`;

  const pagesSettings = config.settings.pages;
  const conversationId = selectedConversation?.id;
  const conversationViewName = getSelectedViewName(conversationId);
  /* const conversationSettings = pagesSettings?.[conversationViewName];
  /* const viewSettings: ViewSettings[] =
    conversationSettings?.views || conversationSettings ? [conversationSettings] : []; */

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
        let updatedPageSettings: PageSettings =
          pagesSettings?.[conversationViewName] || DefaultPageSettings;
        if (viewIndex === 0) {
          updatedPageSettings = { ...conversationSettings, scrollPosition };
        } else if (updatedPageSettings.views) {
          updatedPageSettings.views[viewIndex] = { ...conversationSettings, scrollPosition };
        }
        setSettings({
          ...config.settings,
          pages: {
            ...pagesSettings,
            [conversationViewName]: updatedPageSettings,
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
    viewIndex,
  ]);

  const handleScrollPosition = ({ key, position }: KeyedScrollPosition) => {
    const name = getSelectedViewName(key);
    // TODO debug
    const { scrollPosition } = update;
    const py = +position.y.toFixed(2);
    logger.info('handleScrollPosition', update, name, scrollPosition, position.y, py);
    if (update.name !== name || update.scrollPosition !== py) {
      logger.info('setUpdate', scrollPosition, py);
      setUpdate({ scrollPosition: py, name });
    }
  };

  return (
    <ConversationList
      conversation={selectedConversation}
      selectedMessageId={selectedMessageId}
      scrollPosition={
        conversationSettings &&
        conversationSettings.scrollPosition !== undefined &&
        conversationSettings.scrollPosition !== null
          ? +(conversationSettings.scrollPosition / 1000).toFixed(2)
          : undefined
      }
      messages={messages}
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
  );
}
