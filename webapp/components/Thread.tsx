// Copyright 2023 mik
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
import { BiChevronDown } from 'react-icons/bi';
import { AppContext } from '@/context';
import { Message } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { updateMessage } from '@/utils/conversations';
import MessageView from './Message';
import Prompt from './Prompt';

function Thread({ conversationId }: { conversationId?: string }) {
  const { conversations, setConversations } = useContext(AppContext);
  const initialConversation = conversations.find((c) => c.id === conversationId);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');

  const { t } = useTranslation();

  logger.info(`${conversationId} ${initialConversation?.messages?.length}`);
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => initialConversation?.messages || [],
    [initialConversation?.messages],
  );
  const [showEmptyChat, setShowEmptyChat] = useState(messages.length < 1);

  logger.info(`${conversationId} ${messages.length}`);
  const selectedPreset = 'LLama2';

  const setMessages = (newMessages: Message[]) => {
    let newConversations = [...conversations];
    newMessages.forEach((msg) => {
      newConversations = updateMessage(msg, conversationId as string, newConversations);
    });
    setConversations(newConversations);
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

    setMessages([
      {
        id: `${Date.now()}`,
        content: message,
        author: { role: 'user', name: 'you' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: `${Date.now()}`,
        content: '',
        author: { role: 'system', name: selectedPreset },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    setMessage('');
    setShowEmptyChat(false);

    setMessages([
      ...messages,
      {
        id: `${Date.now()}`,
        content: message,
        author: { role: 'user', name: 'you' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: `${Date.now()}`,
        content: 'What?',
        author: { role: 'system', name: selectedPreset },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
  };

  return (
    <div className="flex max-w-full flex-1 flex-col dark:bg-gray-900">
      <div className="transition-width relative flex h-full w-full flex-1 flex-col items-stretch overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col items-center text-sm">
            <div className="justify-left flex w-full flex-row items-center gap-1 bg-gray-50 p-3 text-gray-500 dark:bg-gray-950 dark:text-gray-300">
              <div className="mx-3 flex h-7 flex-row items-center rounded-md border border-gray-600 px-2">
                {/* <span className="gap-1 py-1 text-gray-700 dark:text-gray-500">{t('Model')} :</span> */}
                <span className="items-center truncate truncate px-3 dark:text-gray-300">
                  {selectedPreset}
                </span>
                <span className="right-0 flex items-center pr-2">
                  <BiChevronDown className="h-4 w-4 text-gray-400" />
                </span>
              </div>
              <div className="hidden rounded-md border border-gray-600 px-3 py-1">
                {t('No plugins installed')}
              </div>
            </div>
          </div>
          {showEmptyChat ? (
            <div className="relative flex h-full w-full flex-col py-10">
              <h1 className="flex h-screen items-center justify-center gap-2 text-center text-2xl font-semibold text-gray-200 dark:text-gray-600">
                {t('Chat with your local GPT')}
              </h1>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageView key={msg.id} message={msg} />
              ))}
              <div className="h-32 w-full flex-shrink-0 md:h-48" />
              <div ref={bottomOfChatRef} />
            </>
          )}
          <div className="flex flex-col items-center text-sm dark:bg-gray-900" />
        </div>
        <Prompt
          message={message}
          isLoading={isLoading}
          errorMessage={errorMessage}
          handleMessage={sendMessage}
          updateMessage={setMessage}
        />
      </div>
    </div>
  );
}

export default Thread;
