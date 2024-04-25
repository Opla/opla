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

import { useEffect, useState } from 'react';
import EmptyView from '@/components/common/EmptyView';
import useTranslation from '@/hooks/useTranslation';
import { KeyedScrollPosition } from '@/hooks/useScroll';
import Opla from '@/components/icons/Opla';
import { AvatarRef, Conversation, Message, MessageImpl, PromptTemplate, Ui } from '@/types';
// import logger from '@/utils/logger';
import useBackend from '@/hooks/useBackendContext';
import { MenuAction, Page, ViewName } from '@/types/ui';
import logger from '@/utils/logger';
import ConversationList from './ConversationList';
import PromptsGrid from './PromptsGrid';
import { useConversationContext } from './ConversationContext';
import { usePromptContext } from '../Prompt/PromptContext';

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
  const { t } = useTranslation();
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
      if (
        conversationSettings &&
        conversationViewName === update.name &&
        update.scrollPosition !== conversationSettings?.scrollPosition
      ) {
        const scrollPosition = update.scrollPosition === -1 ? undefined : update.scrollPosition;
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
    if (update.name !== name || update.scrollPosition !== scrollPosition) {
      logger.info('setUpdate', scrollPosition, position.y);
      setUpdate({ scrollPosition: position.y, name });
    }
  };

  const handlePromptTemplateSelected = (prompt: PromptTemplate) => {
    selectTemplate(prompt);
  };

  const showEmptyChat = !conversationId || !messages || messages.length === 0;
  if (showEmptyChat) {
    let actions: Ui.MenuItem[] | undefined;
    let buttonLabel: string | undefined;
    let description = t(
      "Welcome to Opla! Our platform leverages the power of your device to deliver personalized AI assistance. To kick things off, you'll need to install a model or an assistant. Think of it like choosing your conversation partner. If you've used ChatGPT before, you'll feel right at home here. Remember, this step is essential to begin your journey with Opla. Let's get started!",
    );
    if (selectedAssistantId) {
      description = t('Opla works using your machine processing power.');
    } else if (selectedModelName) {
      buttonLabel = t('Start a conversation');
      description = t('Opla works using your machine processing power.');
    } else if (modelItems.length > 0) {
      description = t('Opla works using your machine processing power.');
    } else {
      actions = [
        {
          label: t('Choose an assistant'),
          onSelect: (data: string) => onSelectMenu(MenuAction.ChooseAssistant, data),
          value: 'choose_assistant',
          description:
            'Opt for a specialized AI agent or GPT to navigate and enhance your daily activities. These assistants can utilize both local models and external services like OpenAI, offering versatile support.',
        },
        {
          label: t('Install a local model'),
          onSelect: (data: string) => onSelectMenu(MenuAction.InstallModel, data),
          value: 'install_model',
          variant: 'outline',
          description:
            'Incorporate an open-source Large Language Model (LLM) such as Gemma or LLama2 directly onto your device. Dive into the world of advanced generative AI and unlock new experimental possibilities.',
        },
        {
          label: t('Use OpenAI'),
          onSelect: (data: string) => onSelectMenu(MenuAction.ConfigureOpenAI, data),
          value: 'configure_openai',
          variant: 'ghost',
          description:
            'Integrate using your OpenAI API key to import ChatGPT conversations and tap into the extensive capabilities of OpenAI. Experience the contrast with local AI solutions. Remember, ChatGPT operates remotely and at a cost!',
        },
      ];
    }
    return (
      <div className="flex grow flex-col">
        <EmptyView
          className="m-2 flex grow"
          title={t('Empower Your Productivity with Local AI Assistants')}
          description={description}
          buttonLabel={disabled ? buttonLabel : undefined}
          icon={<Opla className="h-10 w-10 animate-pulse" />}
          actions={actions}
        />
        {(selectedAssistantId || selectedModelName) && (
          <PromptsGrid
            onPromptSelected={handlePromptTemplateSelected}
            disabled={disabled}
            className="pb-4"
          />
        )}
      </div>
    );
  }
  return (
    <>
      {
        /* isPrompt || */ messages && messages[0]?.conversationId === conversationId && (
          <ConversationList
            conversation={selectedConversation}
            selectedMessageId={selectedMessageId}
            scrollPosition={
              conversationSettings && conversationSettings.scrollPosition !== undefined
                ? conversationSettings.scrollPosition
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
        )
      }
      <div className="flex flex-col items-center text-sm" />
    </>
  );
}
export { ConversationList };
