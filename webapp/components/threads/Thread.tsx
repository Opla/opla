// Copyright 2023 Mik Bry
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

'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Opla from '@/components/icons/Opla';
import { AppContext } from '@/context';
import { Conversation, Message } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  createMessage,
  getConversation,
  updateConversationMessages,
} from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackend';
import { getPresets, getSelectedPreset } from '@/utils/data/presets';
import MessageView from './Message';
import Prompt from './Prompt';
import { ScrollArea } from '../ui/scroll-area';
import Combobox from '../common/Combobox';

function Thread({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const { conversations, setConversations } = useContext(AppContext);
  const { getBackendContext } = useBackend();
  const backendContext = getBackendContext();
  logger.info('backendContext', backendContext);
  const selectedConversation = conversations.find((c) => c.id === conversationId);

  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const [errorMessage, setErrorMessage] = useState<{ [key: string]: string }>({});
  const { currentPrompt = '' } = selectedConversation || {};
  const { t } = useTranslation();

  logger.info(`${conversationId} ${selectedConversation?.messages?.length}`);
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => selectedConversation?.messages || [],
    [selectedConversation?.messages],
  );

  const showEmptyChat = messages.length < 1;

  const selectedPreset = getSelectedPreset(backendContext);
  logger.info(`selectedPreset ${selectedPreset}`);

  const presets = getPresets(backendContext).map((p) => ({
    label: p.title,
    value: p.name,
    icon: Opla,
    selected: p.name === selectedPreset,
  }));

  const onSelectPreset = (value?: string, data?: string) => {
    logger.info(`onSelectPreset ${value} ${data}`);
  };

  const updateMessages = (
    newMessages: Message[],
    selectedConversationId = conversationId,
    selectedConversations = conversations,
  ) => {
    const newConversations = updateConversationMessages(
      selectedConversationId,
      selectedConversations,
      newMessages,
    );
    setConversations(newConversations);

    let newConversationId = selectedConversationId;
    if (!newConversationId) {
      newConversationId = newConversations[newConversations.length - 1].id;
      router.push(`/threads/${newConversationId}`);
    }
    return { newConversationId, newConversations };
  };

  useEffect(() => {
    if (bottomOfChatRef.current) {
      bottomOfChatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (conversationId === undefined) {
      return;
    }
    if (currentPrompt.trim().length < 1) {
      const error = { ...errorMessage, [conversationId]: t('Please enter a message.') };
      setErrorMessage(error);
      return;
    }
    setErrorMessage({ ...errorMessage, [conversationId]: '' });

    setIsLoading({ ...isLoading, [conversationId]: true });

    const toMessage = createMessage({ role: 'user', name: 'you' }, currentPrompt);
    const fromMessage = createMessage({ role: 'system', name: selectedPreset }, '...');
    const { newConversationId, newConversations } = updateMessages([toMessage, fromMessage]);

    const conversation: Conversation = getConversation(
      newConversationId,
      newConversations,
    ) as Conversation;
    conversation.currentPrompt = '';
    fromMessage.content = 'What?';
    updateMessages([fromMessage], newConversationId, newConversations);

    setIsLoading({ ...isLoading, [conversationId]: false });
  };

  const setMessage = (message: string) => {
    logger.info('setMessage', message);
    const newConversations = conversations.map((c) => {
      if (c.id === conversationId) {
        return { ...c, currentPrompt: message };
      }
      return c;
    });
    setConversations(newConversations);
  };

  return (
    <div className="flex h-full flex-col dark:bg-neutral-800/30">
      <div className="grow-0">
        <div className="justify-left flex w-full flex-row items-center gap-4 bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
          <div className="flex flex-1 flex-row items-center">
            <Combobox items={presets} onSelect={onSelectPreset} />
          </div>
          <div className="flex-1">
            <p className="hidden rounded-md border border-neutral-600 px-3 py-1">-</p>
          </div>
          <div className="flex-1">
            <p className="hidden rounded-md border border-neutral-600 px-3 py-1">
              {t('Preset configuration')}
            </p>
          </div>
        </div>
      </div>

      {showEmptyChat ? (
        <div className="flex grow flex-col py-10">
          <h1 className="flex grow items-center justify-center gap-2 text-center text-2xl font-semibold text-neutral-200 dark:text-neutral-600">
            {t('Chat with your local GPT')}
          </h1>
        </div>
      ) : (
        <ScrollArea className="flex h-full flex-col">
          {messages.map((msg) => (
            <MessageView key={msg.id} message={msg} />
          ))}
          <div className="h-4 w-full" />
          <div ref={bottomOfChatRef} />
        </ScrollArea>
      )}
      <div className="flex flex-col items-center text-sm dark:bg-neutral-800/30" />

      <Prompt
        message={currentPrompt}
        isLoading={conversationId ? isLoading[conversationId] : false}
        errorMessage={conversationId ? errorMessage[conversationId] : ''}
        handleMessage={sendMessage}
        updateMessage={setMessage}
      />
    </div>
  );
}

export default Thread;
