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

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { PanelRight, PanelRightClose } from 'lucide-react';
import { AppContext } from '@/context';
import { Conversation, LlmParameters, Message, Model, Prompt, ProviderType } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  createMessage,
  getConversation,
  updateConversation,
  updateConversationMessages,
} from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackendContext';
import { completion, getCompletionParametersDefinition } from '@/utils/providers';
import { findModel, getLocalModelsAsItems, getProviderModelsAsItems } from '@/utils/data/models';
import { findProvider } from '@/utils/data/providers';
import { toast } from '@/components/ui/Toast';
import useDebounceFunc from '@/hooks/useDebounceFunc';
import { ModalData, ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import MessageView from './Message';
import PromptArea from './Prompt';
import { ScrollArea } from '../ui/scroll-area';
import { Toggle } from '../ui/toggle';
import PromptsGrid from './PromptsGrid';
import ThreadMenu from './ThreadMenu';

function Thread({
  conversationId: _conversationId,
  displaySettings,
  onChangeDisplaySettings,
  onSelectMenu,
}: {
  conversationId?: string;
  displaySettings: boolean;
  onChangeDisplaySettings: (displaySettings: boolean) => void;
  onSelectMenu: (menu: string, data: string) => void;
}) {
  const router = useRouter();
  const { providers, conversations, setConversations, setUsage } = useContext(AppContext);
  const { backendContext, setActiveModel } = useBackend();
  const { activeModel } = backendContext.config.models;
  const [tempConversationId, setTempConversationId] = useState<string | undefined>(undefined);
  const conversationId = _conversationId || tempConversationId;
  const selectedConversation = conversations.find((c) => c.id === conversationId);
  const [changedPrompt, setChangedPrompt] = useState<string | undefined>(undefined);
  const { showModal } = useContext(ModalsContext);
  const stream = backendContext.streams?.[conversationId as string];
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const [errorMessage, setErrorMessage] = useState<{ [key: string]: string }>({});
  const { currentPrompt = '' } = selectedConversation || {};
  const { t } = useTranslation();

  logger.info(`${conversationId} ${selectedConversation?.messages?.length}`);
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => selectedConversation?.messages.filter((m) => !(m.author.role === 'system')) || [],
    [selectedConversation?.messages],
  );

  const showEmptyChat = !conversationId; // messages.length < 1;

  const selectedModel = selectedConversation?.model || activeModel;
  const localModelItems = getLocalModelsAsItems(backendContext, selectedModel);
  const cloudModelItems = getProviderModelsAsItems(providers, selectedModel);
  const modelItems = [...localModelItems, ...cloudModelItems];

  useEffect(() => {
    if (bottomOfChatRef.current) {
      bottomOfChatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (_conversationId && tempConversationId) {
      setTempConversationId(undefined);
    }
    if (_conversationId && conversations.find((c) => c.temp)) {
      setConversations(conversations.filter((c) => !c.temp));
    }
  }, [_conversationId, conversations, setConversations, tempConversationId]);

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

    const newConversationId = selectedConversationId;

    return { newConversationId, newConversations };
  };

  const onSelectModel = async (model?: string, provider = ProviderType.opla) => {
    logger.info(`onSelectModel ${model} ${provider} activeModel=${typeof activeModel}`);
    if (model && selectedConversation) {
      const newConversations = updateConversation(
        { ...selectedConversation, model, provider, parameters: {} },
        conversations,
        true,
      );
      setConversations(newConversations);
    } else if (model && !activeModel) {
      await setActiveModel(model);
    }
  };

  const sendMessage = async (message: Message, context: Message[], conversation: Conversation) => {
    let model: Model | undefined;
    let providerName: string | undefined = model?.provider;
    const returnedMessage = { ...message };
    if (conversation.provider && conversation.model) {
      const provider = findProvider(conversation.provider, providers);
      model = findModel(conversation.model, provider?.models || []);
      if (provider) {
        providerName = provider.name;
      }
    }
    if (!model) {
      model = findModel(conversation.model || activeModel, backendContext.config.models.items);
    }

    const parameters: LlmParameters[] = [];
    if (conversation.parameters) {
      const conversationParameters = conversation.parameters;
      const provider = findProvider(conversation.provider, providers);
      const parametersDefinition = getCompletionParametersDefinition(provider);
      Object.keys(conversation.parameters).forEach((key) => {
        const parameterDef = parametersDefinition[key];
        if (parameterDef) {
          const result = parameterDef.z.safeParse(conversationParameters[key]);
          if (result.success) {
            parameters.push({ key, value: String(result.data) });
          }
        }
      });
    }
    try {
      const response = await completion(
        model,
        providerName,
        { providers },
        context,
        conversation?.system,
        conversationId,
        parameters,
      );
      setUsage(response.usage);
      returnedMessage.content = response.content.trim();
    } catch (e: any) {
      logger.error('sendMessage', e, typeof e);
      setErrorMessage({ ...errorMessage, [conversation.id]: String(e) });
      returnedMessage.content = t('Oops, something went wrong.');
      returnedMessage.status = 'error';
      toast.error(String(e));
    }
    returnedMessage.status = 'delivered';
    return returnedMessage;
  };

  const onSendMessage = async () => {
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
    let fromMessage = createMessage({ role: 'assistant', name: selectedModel }, '...');
    fromMessage.status = 'pending';
    toMessage.sibling = fromMessage.id;
    fromMessage.sibling = toMessage.id;
    const { newConversationId, newConversations: nc } = updateMessages([toMessage, fromMessage]);
    let newConversations = nc;

    const conversation: Conversation = getConversation(
      newConversationId,
      newConversations,
    ) as Conversation;
    if (conversation.temp) {
      conversation.name = conversation.currentPrompt as string;
    }
    conversation.currentPrompt = '';
    setChangedPrompt(undefined);
    conversation.temp = false;
    newConversations = updateConversation(conversation, newConversations);
    setConversations(newConversations);

    // TODO build tokens context : better than [toMessage]
    fromMessage = await sendMessage(fromMessage, [toMessage], conversation);

    updateMessages([fromMessage], newConversationId, newConversations);
    if (tempConversationId) {
      router.push(`/threads/${tempConversationId}`);
    }

    setIsLoading({ ...isLoading, [conversationId]: false });
  };

  const onResendMessage = async (message: Message) => {
    if (conversationId === undefined) {
      return;
    }
    setErrorMessage({ ...errorMessage, [conversationId]: '' });
    setIsLoading({ ...isLoading, [conversationId]: true });

    let fromMessage: Message = { ...message, status: 'pending', content: '...' };
    if (message.content && message.content !== '...' && message.status !== 'error') {
      const { contentHistory = [] } = message;
      contentHistory.push(message.content);
      fromMessage.contentHistory = contentHistory;
    }
    const { newConversationId, newConversations } = updateMessages([fromMessage]);

    const conversation: Conversation = getConversation(
      newConversationId,
      newConversations,
    ) as Conversation;

    // TODO build tokens context : better than [toMessage]
    const context: Message[] = [];
    const index = conversation.messages.findIndex((m) => m.id === message.id);
    if (index > 0) {
      context.push(conversation.messages[index - 1]);
    }

    fromMessage = await sendMessage(fromMessage, context, conversation);

    updateMessages([fromMessage], newConversationId, newConversations);

    setIsLoading({ ...isLoading, [conversationId]: false });
  };

  const onDeleteMessages = (action: string, data: ModalData) => {
    if (conversationId === undefined) {
      return;
    }
    const message = data?.item as Message;
    logger.info(`delete ${action} ${data}`);
    if (message) {
      if (action === 'Delete') {
        const conversation = getConversation(conversationId, conversations);
        if (conversation) {
          conversation.messages = conversation.messages.filter(
            (m) => m.id !== message.id && m.id !== message.sibling,
          );
          setConversations(updateConversation(conversation, conversations));
        }
      }
    }
  };

  const onShouldDeleteMessage = (message: Message) => {
    showModal(ModalIds.DeleteItem, {
      title: 'Delete this message and siblings ?',
      item: message,
      onAction: onDeleteMessages,
    });
  };

  const onChangeMessageContent = (message: Message, newContent: string, submit: boolean) => {
    if (conversationId === undefined) {
      return;
    }
    const conversation = getConversation(conversationId, conversations);
    if (conversation) {
      const newMessages = conversation.messages.map((m) => {
        if (m.id === message.id) {
          const { contentHistory = [] } = m;
          contentHistory.push(message.content);
          return { ...m, content: newContent, contentHistory };
        }
        return m;
      });
      updateMessages(newMessages, conversationId, conversations);
    }
    if (submit) {
      const sibling = conversation?.messages.find((m) => m.id === message.sibling);
      if (sibling) {
        onResendMessage(sibling);
      }
    }
  };

  const onUpdatePrompt = useCallback(
    (message: string | undefined, conversationName = 'Conversation') => {
      if (message === '' && tempConversationId) {
        setChangedPrompt(undefined);
        setConversations(conversations.filter((c) => !c.temp));
        setTempConversationId(undefined);
        return;
      }
      const conversation = getConversation(conversationId, conversations) as Conversation;
      if (conversation && conversation.currentPrompt === message) {
        setChangedPrompt(undefined);
        return;
      }
      let newConversations: Conversation[];
      if (conversation) {
        conversation.currentPrompt = message;
        newConversations = conversations.filter((c) => !(c.temp && c.id !== conversationId));
        newConversations = updateConversation(conversation, newConversations, true);
      } else {
        newConversations = conversations.filter((c) => !c.temp);
        newConversations = updateConversationMessages(conversationId, newConversations, []);
        const newConversation = newConversations[newConversations.length - 1];
        newConversation.temp = true;
        newConversation.name = conversationName;
        newConversation.currentPrompt = message;
        setTempConversationId(newConversation.id);
      }
      setConversations(newConversations);
      setChangedPrompt(undefined);
    },
    [conversationId, conversations, setConversations, tempConversationId],
  );

  useDebounceFunc<string | undefined>(onUpdatePrompt, changedPrompt, 500);

  const onChangePrompt = (text: string) => {
    if (text !== currentPrompt) {
      setChangedPrompt(text);
    }
  };

  const onPromptSelected = (prompt: Prompt) => {
    onUpdatePrompt(prompt.value, prompt.name);
  };

  return (
    <div className="flex h-full flex-col dark:bg-neutral-800/30">
      <div className="grow-0">
        <div className="justify-left flex w-full flex-row items-center gap-4 bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
          <div className="flex grow flex-row items-center">
            <ThreadMenu
              selectedModel={selectedModel}
              selectedConversationId={conversationId}
              modelItems={modelItems}
              onSelectModel={onSelectModel}
              onSelectMenu={onSelectMenu}
            />
          </div>
          <div className="flex-1">
            <p className="hidden rounded-md border border-neutral-600 px-3 py-1">-</p>
          </div>
          <div className="flex-1">
            <p className="hidden rounded-md border border-neutral-600 px-3 py-1">
              {t('Preset configuration')}
            </p>
          </div>
          <div>
            <Toggle
              aria-label="Toggle thread settings"
              pressed={displaySettings}
              onPressedChange={() => onChangeDisplaySettings(!displaySettings)}
            >
              {displaySettings ? (
                <PanelRightClose strokeWidth={1.5} />
              ) : (
                <PanelRight strokeWidth={1.5} />
              )}
            </Toggle>
          </div>
        </div>
      </div>

      {showEmptyChat ? (
        <div className="flex grow flex-col py-10">
          <h1 className="flex grow items-center justify-center gap-2 text-center text-2xl font-semibold text-neutral-200 dark:text-neutral-600">
            {t('Chat with your local GPT')}
          </h1>
          <PromptsGrid onPromptSelected={onPromptSelected} />
        </div>
      ) : (
        <ScrollArea className="flex h-full flex-col">
          {messages.map((msg, index) => {
            let m = msg;
            if (stream && msg.content === '...' && index === messages.length - 1) {
              m = { ...msg, content: (stream.content as string[]).join('') };
            }
            return (
              <MessageView
                key={msg.id}
                message={m}
                onResendMessage={() => {
                  onResendMessage(m);
                }}
                onDeleteMessage={() => {
                  onShouldDeleteMessage(m);
                }}
                onChangeContent={(newContent, submit) => {
                  onChangeMessageContent(m, newContent, submit);
                }}
              />
            );
          })}
          <div className="h-4 w-full" />
          <div ref={bottomOfChatRef} />
        </ScrollArea>
      )}
      <div className="flex flex-col items-center text-sm dark:bg-neutral-800/30" />

      <PromptArea
        conversationId={conversationId as string}
        message={changedPrompt === undefined ? currentPrompt : changedPrompt}
        isLoading={conversationId ? isLoading[conversationId] : false}
        errorMessage={conversationId ? errorMessage[conversationId] : ''}
        onSendMessage={onSendMessage}
        onUpdatePrompt={onChangePrompt}
      />
    </div>
  );
}

export default Thread;
