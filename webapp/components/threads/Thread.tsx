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

import { useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { PanelLeft, PanelLeftClose, PanelRight, PanelRightClose } from 'lucide-react';
import { AppContext } from '@/context';
import {
  Conversation,
  LlmParameters,
  Message,
  MessageState,
  Model,
  Prompt,
  ProviderType,
} from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  createConversation,
  createMessage,
  getConversation,
  updateConversation,
  mergeMessages,
  updateOrCreateConversation,
} from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackendContext';
import { buildContext, completion, getCompletionParametersDefinition } from '@/utils/providers';
import { findModel, getLocalModelsAsItems, getProviderModelsAsItems } from '@/utils/data/models';
import { findProvider, getLocalProviders } from '@/utils/data/providers';
import { toast } from '@/components/ui/Toast';
import useDebounceFunc from '@/hooks/useDebounceFunc';
import { ModalData, ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import { MenuAction, Page } from '@/types/ui';
import { KeyedScrollPosition } from '@/hooks/useScroll';
import PromptArea from './Prompt';
import PromptsGrid from './PromptsGrid';
import ThreadMenu from './ThreadMenu';
import { Button } from '../ui/button';
import ConversationView from './Conversation';

function Thread({
  conversationId: _conversationId,
  displayExplorer,
  displaySettings,
  onChangeDisplayExplorer,
  onChangeDisplaySettings,
  onSelectMenu,
}: {
  conversationId?: string;
  displayExplorer: boolean;
  displaySettings: boolean;
  onChangeDisplayExplorer: (displayExplorer: boolean) => void;
  onChangeDisplaySettings: (displaySettings: boolean) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
}) {
  const router = useRouter();
  const {
    providers,
    conversations,
    readConversationMessages,
    updateConversations,
    getConversationMessages,
    filterConversationMessages,
    updateConversationMessages,
    setUsage,
  } = useContext(AppContext);
  const { backendContext, setActiveModel } = useBackend();
  const { activeModel: aModel } = backendContext.config.models;
  const [tempModelProvider, setTempModelProvider] = useState<[string, ProviderType] | undefined>(
    undefined,
  );
  const activeModel = tempModelProvider?.[0] || aModel;
  const [tempConversationId, setTempConversationId] = useState<string | undefined>(undefined);
  const conversationId = _conversationId || tempConversationId;
  const selectedConversation = conversations.find((c) => c.id === conversationId);
  const [changedPrompt, setChangedPrompt] = useState<string | undefined>(undefined);
  const { showModal } = useContext(ModalsContext);
  const [messages, setMessages] = useState<Message[] | undefined>(undefined);
  const [isMessageLoading, setIsMessageLoading] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({});
  const [errorMessage, setErrorMessage] = useState<{ [key: string]: string }>({});
  const { currentPrompt = '' } = selectedConversation || {};
  const { t } = useTranslation();

  useEffect(() => {
    const getNewMessages = async () => {
      let newMessages: Message[] = [];
      if (conversationId) {
        await readConversationMessages(conversationId, []);
        const stream = backendContext.streams?.[conversationId as string];
        newMessages = filterConversationMessages(
          conversationId,
          (m) => !(m.author.role === 'system'),
        );
        newMessages = newMessages.map((msg, index) => {
          if (stream && index === newMessages.length - 1) {
            return { ...msg, status: 'stream', content: stream.content.join('') } as Message;
          }
          return { ...msg, conversationId };
        });
      }
      setMessages(newMessages);
      setIsMessageLoading(false);
    };
    if (isMessageLoading) {
      return;
    }
    logger.info('getNewMessages', conversationId, isMessageLoading);
    setIsMessageLoading(true);
    getNewMessages();
  }, [
    backendContext.streams,
    conversationId,
    filterConversationMessages,
    readConversationMessages,
    isMessageLoading,
  ]);

  const showEmptyChat = !conversationId;
  const selectedModel = selectedConversation?.model || activeModel;
  const localModelItems = getLocalModelsAsItems(
    backendContext,
    selectedModel,
    getLocalProviders(providers),
  );
  const cloudModelItems = getProviderModelsAsItems(providers, selectedModel);
  const modelItems = [...localModelItems, ...cloudModelItems];

  useEffect(() => {
    if (_conversationId && tempConversationId) {
      setTempConversationId(undefined);
    }
    if (!tempConversationId && !_conversationId) {
      const temp = conversations.find((c) => c.temp);
      if (temp) {
        setTempConversationId(temp.id);
      }
    }
    if (_conversationId && conversations.find((c) => c.temp)) {
      updateConversations(conversations.filter((c) => !c.temp));
    }
  }, [_conversationId, conversations, updateConversations, tempConversationId]);

  const updateMessagesAndConversation = async (
    changedMessages: Message[],
    _conversationMessages?: Message[],
    selectedConversationId = conversationId,
    selectedConversations = conversations,
  ) => {
    const conversationMessages =
      _conversationMessages || getConversationMessages(selectedConversationId);
    const updatedConversations = updateOrCreateConversation(
      selectedConversationId,
      selectedConversations,
      messages?.[0]?.content as string,
    );
    const updatedMessages = mergeMessages(conversationMessages, changedMessages);
    updateConversations(updatedConversations);
    await updateConversationMessages(selectedConversationId, updatedMessages);

    const updatedConversationId = selectedConversationId;

    return { updatedConversationId, updatedConversations, updatedMessages };
  };

  const handleSelectModel = async (model?: string, provider = ProviderType.opla) => {
    logger.info(
      `handleSelectModel ${model} ${provider} activeModel=${typeof activeModel}`,
      selectedConversation,
    );
    if (model && selectedConversation) {
      const newConversations = updateConversation(
        { ...selectedConversation, model, provider, parameters: {} },
        conversations,
        true,
      );
      updateConversations(newConversations);
    } else if (model && !activeModel) {
      await setActiveModel(model);
    } else if (model) {
      setTempModelProvider([model, provider]);
    }
  };

  const sendMessage = async (
    message: Message,
    conversationMessages: Message[],
    conversation: Conversation,
    updatedConversations: Conversation[],
  ) => {
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
    const index = conversationMessages.findIndex((m) => m.id === message.id);
    const context = buildContext(conversation, conversationMessages, index);

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
      returnedMessage.status = MessageState.Error;
      toast.error(String(e));
    }
    returnedMessage.status = MessageState.Delivered;

    await updateMessagesAndConversation(
      [returnedMessage],
      conversationMessages,
      conversation.id,
      updatedConversations,
    );
    return returnedMessage;
  };

  const handleSendMessage = async () => {
    if (conversationId === undefined) {
      return;
    }
    if (currentPrompt.trim().length < 1) {
      const error = { ...errorMessage, [conversationId]: t('Please enter a message.') };
      setErrorMessage(error);
      return;
    }
    setErrorMessage({ ...errorMessage, [conversationId]: '' });

    setIsProcessing({ ...isProcessing, [conversationId]: true });

    const userMessage = createMessage({ role: 'user', name: 'you' }, currentPrompt);
    let message = createMessage({ role: 'assistant', name: selectedModel }, '...');
    message.status = MessageState.Pending;
    userMessage.sibling = message.id;
    message.sibling = userMessage.id;

    const {
      updatedConversationId,
      updatedConversations: uc,
      updatedMessages,
    } = await updateMessagesAndConversation([userMessage, message]);
    let updatedConversations = uc;

    const conversation: Conversation = getConversation(
      updatedConversationId,
      updatedConversations,
    ) as Conversation;
    if (conversation.temp) {
      conversation.name = conversation.currentPrompt as string;
    }

    conversation.currentPrompt = '';
    setChangedPrompt(undefined);
    conversation.temp = false;

    updatedConversations = updateConversation(conversation, updatedConversations);
    updateConversations(updatedConversations);
    logger.info('onSendMessage', updatedMessages, conversation);
    message = await sendMessage(message, updatedMessages, conversation, updatedConversations);

    if (tempConversationId) {
      router.push(`${Page.Threads}/${tempConversationId}`);
    }

    setIsProcessing({ ...isProcessing, [conversationId]: false });
  };

  const handleResendMessage = async (previousMessage: Message) => {
    if (conversationId === undefined) {
      return;
    }
    setErrorMessage({ ...errorMessage, [conversationId]: '' });
    setIsProcessing({ ...isProcessing, [conversationId]: true });

    let message: Message = { ...previousMessage, status: MessageState.Pending, content: '...' };
    if (
      previousMessage.content &&
      previousMessage.content !== '...' &&
      previousMessage.status !== 'error'
    ) {
      const { contentHistory = [] } = previousMessage;
      contentHistory.push(previousMessage.content);
      message.contentHistory = contentHistory;
    }
    const { updatedConversationId, updatedConversations, updatedMessages } =
      await updateMessagesAndConversation([message]);

    const conversation: Conversation = getConversation(
      updatedConversationId,
      updatedConversations,
    ) as Conversation;

    message = await sendMessage(message, updatedMessages, conversation, updatedConversations);

    setIsProcessing({ ...isProcessing, [conversationId]: false });
  };

  const handleDeleteMessages = async (action: string, data: ModalData) => {
    if (conversationId === undefined) {
      return;
    }
    const message = data?.item as Message;
    logger.info(`delete ${action} ${data}`);
    if (message) {
      if (action === 'Delete') {
        const conversation = getConversation(conversationId, conversations);
        if (conversation) {
          const updatedMessages = await filterConversationMessages(
            conversationId,
            (m) => m.id !== message.id && m.id !== message.sibling,
          );
          updateConversationMessages(conversationId, updatedMessages);
        }
      }
    }
  };

  const handleShouldDeleteMessage = (message: Message) => {
    showModal(ModalIds.DeleteItem, {
      title: 'Delete this message and siblings ?',
      item: message,
      onAction: handleDeleteMessages,
    });
  };

  const handleChangeMessageContent = async (
    message: Message,
    newContent: string,
    submit: boolean,
  ) => {
    if (conversationId === undefined) {
      return;
    }
    const conversation = getConversation(conversationId, conversations);
    if (conversation) {
      const conversationMessages = getConversationMessages(conversationId);
      const newMessages = conversationMessages.map((m) => {
        if (m.id === message.id) {
          const { contentHistory = [] } = m;
          contentHistory.push(message.content);
          return { ...m, content: newContent, contentHistory };
        }
        return m;
      });
      updateMessagesAndConversation(
        newMessages,
        conversationMessages,
        conversationId,
        conversations,
      );
    }
    if (submit) {
      const sibling = getConversationMessages(conversationId).find((m) => m.id === message.sibling);
      if (sibling) {
        handleResendMessage(sibling);
      }
    }
  };

  const handleUpdatePrompt = useCallback(
    (message: string | undefined, conversationName = 'Conversation') => {
      if (message === '' && tempConversationId) {
        setChangedPrompt(undefined);
        updateConversations(conversations.filter((c) => !c.temp));
        setTempConversationId(undefined);
        return;
      }
      const conversation = getConversation(conversationId, conversations) as Conversation;
      if (conversation && conversation.currentPrompt === message) {
        setChangedPrompt(undefined);
        return;
      }
      let updatedConversations: Conversation[];
      if (conversation) {
        conversation.currentPrompt = message;
        updatedConversations = conversations.filter((c) => !(c.temp && c.id !== conversationId));
        updatedConversations = updateConversation(conversation, updatedConversations, true);
      } else {
        updatedConversations = conversations.filter((c) => !c.temp);
        const newConversation = createConversation('Conversation');
        updatedConversations.push(newConversation);
        newConversation.temp = true;
        newConversation.name = conversationName;
        newConversation.currentPrompt = message;
        if (tempModelProvider) {
          [newConversation.model, newConversation.provider] = tempModelProvider;
          setTempModelProvider(undefined);
        }
        setTempConversationId(newConversation.id);
      }
      updateConversations(updatedConversations);
      setChangedPrompt(undefined);
    },
    [conversationId, conversations, updateConversations, tempConversationId, tempModelProvider],
  );

  useDebounceFunc<string | undefined>(handleUpdatePrompt, changedPrompt, 500);

  const handleChangePrompt = (text: string) => {
    if (text !== currentPrompt) {
      setChangedPrompt(text);
    }
  };

  const handlePromptSelected = (prompt: Prompt) => {
    handleUpdatePrompt(prompt.value, prompt.name);
  };

  const handleScrollPosition = ({ key, position }: KeyedScrollPosition) => {
    const conversation = getConversation(key, conversations);
    if (conversation && conversation.scrollPosition !== position.y && position.y !== -1) {
      logger.info(`handleScrollPosition ${key} ${conversationId}`, position);
      conversation.scrollPosition = position.y;
      const updatedConversations = updateConversation(conversation, conversations, true);
      updateConversations(updatedConversations);
    }
  };

  logger.info(
    `render Thread ${conversationId}`,
    selectedConversation,
    selectedConversation?.scrollPosition,
  );
  const message = changedPrompt === undefined ? currentPrompt : changedPrompt;
  return (
    <div className="flex h-full flex-col dark:bg-neutral-800/30">
      <div className="grow-0">
        <div className="justify-left flex w-full flex-row items-center gap-4 bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
          <div className="flex grow flex-row items-center">
            <ThreadMenu
              selectedModel={selectedModel}
              selectedConversationId={conversationId}
              modelItems={modelItems}
              onSelectModel={handleSelectModel}
              onSelectMenu={onSelectMenu}
            />
          </div>
          <div className="flex-1">
            <p className="hidden rounded-md border border-neutral-600 px-3 py-1">-</p>
          </div>
          <div className="flex flex-1 flex-row justify-end gap-2">
            <Button
              aria-label="Toggle thread explorer"
              variant="ghost"
              size="sm"
              className="p-1 text-neutral-400 transition-colors duration-200 hover:bg-neutral-500/10 hover:text-white dark:border-white/20 dark:text-neutral-400 hover:dark:text-white"
              onClick={() => onChangeDisplayExplorer(!displayExplorer)}
            >
              {displayExplorer ? (
                <PanelLeftClose strokeWidth={1.5} />
              ) : (
                <PanelLeft strokeWidth={1.5} />
              )}
            </Button>
            <Button
              aria-label="Toggle thread settings"
              variant="ghost"
              size="sm"
              className="p-1 text-neutral-400 transition-colors duration-200 hover:bg-neutral-500/10 hover:text-white dark:border-white/20 dark:text-neutral-400 hover:dark:text-white"
              onClick={() => onChangeDisplaySettings(!displaySettings)}
            >
              {displaySettings ? (
                <PanelRightClose strokeWidth={1.5} />
              ) : (
                <PanelRight strokeWidth={1.5} />
              )}
            </Button>
          </div>
        </div>
      </div>

      {showEmptyChat ? (
        <div className="flex grow flex-col py-10">
          <h1 className="flex grow items-center justify-center gap-2 text-center text-2xl font-semibold text-neutral-200 dark:text-neutral-600">
            {t('Chat with your local GPT')}
          </h1>
          <PromptsGrid onPromptSelected={handlePromptSelected} />
        </div>
      ) : (
        (message || (messages && messages[0]?.conversationId === conversationId)) && (
          <ConversationView
            conversationId={selectedConversation?.id as string}
            scrollPosition={
              selectedConversation && selectedConversation.scrollPosition !== undefined
                ? selectedConversation.scrollPosition
                : -1
            }
            messages={messages || []}
            onScrollPosition={handleScrollPosition}
            handleResendMessage={handleResendMessage}
            handleShouldDeleteMessage={handleShouldDeleteMessage}
            handleChangeMessageContent={handleChangeMessageContent}
          />
        )
      )}
      <div className="flex flex-col items-center text-sm dark:bg-neutral-800/30" />

      {(message || (messages && messages[0]?.conversationId === conversationId)) && (
        <PromptArea
          conversationId={conversationId as string}
          message={message}
          isLoading={conversationId ? isProcessing[conversationId] : false}
          errorMessage={conversationId ? errorMessage[conversationId] : ''}
          onSendMessage={handleSendMessage}
          onUpdatePrompt={handleChangePrompt}
        />
      )}
    </div>
  );
}

export default Thread;
