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
import { AvatarRef, Conversation, Message, PromptTemplate } from '@/types';
import logger from '@/utils/logger';
import { AppContext } from '@/context';
import { getConversation, updateConversation } from '@/utils/data/conversations';
import { ParsedPrompt } from '@/utils/parsers';
import ConversationList from './ConversationList';
import PromptsGrid from './PromptsGrid';

export type ConversationPanelProps = {
  selectedConversation: Conversation | undefined;
  messages: Message[] | undefined;
  avatars: AvatarRef[];
  disabled: boolean;
  isPrompt: boolean;
  onResendMessage: (m: Message) => void;
  onDeleteMessage: (m: Message) => void;
  onDeleteAssets: (m: Message) => void;
  onChangeMessageContent: (m: Message, newContent: string, submit: boolean) => void;
  onSelectPrompt: (prompt: ParsedPrompt, name: string) => void;
  parseAndValidatePrompt: (prompt: string) => ParsedPrompt;
};

export function ConversationPanel({
  messages,
  avatars,
  selectedConversation,
  disabled,
  isPrompt,
  onResendMessage,
  onDeleteMessage,
  onDeleteAssets,
  onChangeMessageContent,
  onSelectPrompt,
  parseAndValidatePrompt,
}: ConversationPanelProps) {
  const { t } = useTranslation();
  const { conversations, updateConversations } = useContext(AppContext);

  const handleScrollPosition = ({ key, position }: KeyedScrollPosition) => {
    const conversation = getConversation(key, conversations);
    logger.info(
      `handleScrollPosition ${key} ${conversation?.id}`,
      position,
      conversation?.scrollPosition,
    );
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
  return (
    <>
      {showEmptyChat ? (
        <div className="flex grow flex-col pb-10">
          <EmptyView
            className="m-2 grow"
            title={t('Chat with your private local GPT')}
            description={t('Opla works using your machine processing power.')}
            buttonLabel={disabled ? t('Start a conversation') : undefined}
            icon={<Opla className="h-10 w-10 animate-pulse" />}
          />
          <PromptsGrid onPromptSelected={handlePromptTemplateSelected} disabled={disabled} />
        </div>
      ) : (
        (isPrompt || (messages && messages[0]?.conversationId === selectedConversation.id)) && (
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
        )
      )}
      <div className="flex flex-col items-center text-sm dark:bg-neutral-800/30" />
    </>
  );
}
export { ConversationList };
