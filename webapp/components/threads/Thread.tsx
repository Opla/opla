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
import { BrainCircuit } from 'lucide-react';
import Opla from '@/components/icons/Opla';
import { AppContext } from '@/context';
import Dropdown from '@/components/common/Dropdown';
import { Message } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { createMessage, updateConversationMessages } from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackend';
import MessageView from './Message';
import Prompt from './Prompt';

function Thread({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const { conversations, setConversations } = useContext(AppContext);
  const { getBackendContext } = useBackend();
  const backendContext = getBackendContext();
  logger.info('backendContext', backendContext);
  const selectedConversation = conversations.find((c) => c.id === conversationId);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');

  const { t } = useTranslation();

  logger.info(`${conversationId} ${selectedConversation?.messages?.length}`);
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => selectedConversation?.messages || [],
    [selectedConversation?.messages],
  );

  const showEmptyChat = messages.length < 1;

  const selectedPreset = `${backendContext.config.server.name}::${backendContext.config.models.defaultModel}`;
  logger.info(`selectedPreset ${selectedPreset}`);

  const presets = [
    { label: selectedPreset, value: backendContext.config.server.name, icon: Opla, selected: true },
    { label: 'OpenAI GPT-3.5', value: 'GPT-3.5', icon: BrainCircuit },
    { label: 'OpenAI GPT-4', value: 'GPT-4', icon: BrainCircuit },
  ];

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
    if (message.length < 1) {
      setErrorMessage(t('Please enter a message.'));
      return;
    }
    setErrorMessage('');

    setIsLoading(true);

    const toMessage = createMessage({ role: 'user', name: 'you' }, message);
    const fromMessage = createMessage({ role: 'system', name: selectedPreset }, '...');
    const { newConversationId, newConversations } = updateMessages([toMessage, fromMessage]);

    setMessage('');

    fromMessage.content = 'What?';
    updateMessages([fromMessage], newConversationId, newConversations);
  };

  return (
    <div className="flex grow flex-col dark:bg-neutral-800/30">
      <div className="grow-0">
        <div className="justify-left flex w-full flex-row items-center gap-4 bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
          <div className="flex flex-1 flex-row items-center">
            <Dropdown items={presets} onSelect={onSelectPreset} />
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
      <div className="grow">
        <div className="flex h-full flex-col overflow-y-auto">
          {showEmptyChat ? (
            <div className="flex grow flex-col py-10">
              <h1 className="flex grow items-center justify-center gap-2 text-center text-2xl font-semibold text-neutral-200 dark:text-neutral-600">
                {t('Chat with your local GPT')}
              </h1>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageView key={msg.id} message={msg} />
              ))}
              <div className="h-4 w-full" />
              <div ref={bottomOfChatRef} />
            </>
          )}
          <div className="flex flex-col items-center text-sm dark:bg-neutral-800/30" />
        </div>
      </div>
      <Prompt
        message={message}
        isLoading={isLoading}
        errorMessage={errorMessage}
        handleMessage={sendMessage}
        updateMessage={setMessage}
      />
    </div>
  );
}

export default Thread;
