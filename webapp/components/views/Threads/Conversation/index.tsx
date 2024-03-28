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

import { useContext } from 'react';
import EmptyView from '@/components/common/EmptyView';
import useTranslation from '@/hooks/useTranslation';
import { KeyedScrollPosition } from '@/hooks/useScroll';
import Opla from '@/components/icons/Opla';
import { AvatarRef, Conversation, Message, PromptTemplate, Ui } from '@/types';
// import logger from '@/utils/logger';
import { AppContext } from '@/context';
import { getConversation, updateConversation } from '@/utils/data/conversations';
import { ParsedPrompt } from '@/utils/parsers';
import { MenuAction } from '@/types/ui';
import ConversationList from './ConversationList';
import PromptsGrid from './PromptsGrid';

export type ConversationPanelProps = {
  selectedConversation: Conversation | undefined;
  selectedAssistantId: string | undefined;
  selectedModelName: string;
  messages: Message[] | undefined;
  avatars: AvatarRef[];
  modelItems: Ui.MenuItem[];
  disabled: boolean;
  isPrompt: boolean;
  onResendMessage: (m: Message) => void;
  onDeleteMessage: (m: Message) => void;
  onDeleteAssets: (m: Message) => void;
  onChangeMessageContent: (m: Message, newContent: string, submit: boolean) => void;
  onSelectPrompt: (prompt: ParsedPrompt, name: string) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
  parseAndValidatePrompt: (prompt: string) => ParsedPrompt;
};

export function ConversationPanel({
  messages,
  avatars,
  selectedConversation,
  selectedAssistantId,
  selectedModelName,
  modelItems,
  disabled,
  isPrompt,
  onResendMessage,
  onDeleteMessage,
  onDeleteAssets,
  onChangeMessageContent,
  onSelectPrompt,
  onSelectMenu,
  parseAndValidatePrompt,
}: ConversationPanelProps) {
  const { t } = useTranslation();
  const { conversations, updateConversations } = useContext(AppContext);

  const handleScrollPosition = ({ key, position }: KeyedScrollPosition) => {
    const conversation = getConversation(key, conversations);
    /* logger.info(
      `handleScrollPosition ${key} ${conversation?.id}`,
      position,
      conversation?.scrollPosition,
    ); */
    if (conversation && conversation.scrollPosition !== position.y) {
      conversation.scrollPosition = position.y === -1 ? undefined : position.y;
      const updatedConversations = updateConversation(conversation, conversations, true);
      updateConversations(updatedConversations);
    }
  };

  const handlePromptTemplateSelected = (prompt: PromptTemplate) => {
    onSelectPrompt(parseAndValidatePrompt(prompt.value), prompt.name);
  };

  const showEmptyChat = !selectedConversation?.id;
  if (showEmptyChat) {
    let actions: Ui.MenuItem[] | undefined;
    let buttonLabel: string | undefined;
    let description = t(
      "Welcome to Opla! Our platform leverages the power of your device to deliver personalized AI assistance. To kick things off, you'll need to install a model or an assistant. Think of it like choosing your conversation partner. If you've used ChatGPT before, you'll feel right at home here. Remember, this step is essential to begin your journey with Opla. Let's get started!",
    );
    if (selectedAssistantId) {
      buttonLabel = t('Start a conversation with {{assistant}}', {
        assistant: selectedAssistantId,
      });
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
      {(isPrompt || (messages && messages[0]?.conversationId === selectedConversation.id)) && (
        <ConversationList
          conversationId={selectedConversation?.id as string}
          scrollPosition={
            selectedConversation && selectedConversation.scrollPosition !== undefined
              ? selectedConversation.scrollPosition
              : undefined
          }
          messages={messages || []}
          avatars={avatars}
          onScrollPosition={handleScrollPosition}
          onResendMessage={onResendMessage}
          onDeleteMessage={onDeleteMessage}
          onDeleteAssets={onDeleteAssets}
          onChangeMessageContent={onChangeMessageContent}
        />
      )}
      <div className="flex flex-col items-center text-sm" />
    </>
  );
}
export { ConversationList };
