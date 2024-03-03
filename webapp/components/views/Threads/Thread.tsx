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

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useSearchParams } from 'next/navigation';
import { AppContext } from '@/context';
import {
  Asset,
  Conversation,
  AIService,
  AIServiceType,
  Message,
  MessageStatus,
  ProviderType,
} from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  createConversation,
  getConversation,
  updateConversation,
  getConversationAssets,
  getServiceModelId,
  getConversationModelId,
  addService,
  addConversationService,
} from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackendContext';
import { completion } from '@/utils/providers';
import { getModelsAsItems } from '@/utils/data/models';
import { getActiveService } from '@/utils/services';
import { toast } from '@/components/ui/Toast';
import useDebounceFunc from '@/hooks/useDebounceFunc';
import { ModalData, ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import { MenuAction, Page } from '@/types/ui';
import {
  ParsedPrompt,
  PromptToken,
  PromptTokenState,
  PromptTokenType,
  compareMentions,
  comparePrompts,
  parsePrompt,
  toPrompt,
} from '@/utils/parsers';
import { getConversationTitle } from '@/utils/conversations';
import validator from '@/utils/parsers/validator';
import { createMessage, changeMessageContent } from '@/utils/data/messages';
import { getCommandManager } from '@/utils/commands';
import ContentView from '@/components/common/ContentView';
import { useAssistantStore } from '@/stores';
import PromptArea from './Prompt';
import { ConversationPanel } from './Conversation';
import ThreadMenu from './Menu';

function Thread({
  conversationId: _conversationId,
  rightToolbar,
  onSelectMenu,
  onError,
}: {
  conversationId?: string;
  rightToolbar: React.ReactNode;
  onSelectMenu: (menu: MenuAction, data: string) => void;
  onError: (error: string) => void;
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
    updateMessagesAndConversation,
    setUsage,
    setProviders,
    presets,
  } = useContext(AppContext);
  const { backendContext, setActiveModel } = useBackend();
  const searchParams = useSearchParams();
  const assistantId = searchParams?.get('assistant') || undefined;
  const { getAssistant } = useAssistantStore();
  const assistant = getAssistant(assistantId);
  const [service, setService] = useState<AIService | undefined>(undefined);
  const activeModel = getServiceModelId(service) || backendContext.config.models.activeModel;
  const [tempConversationId, setTempConversationId] = useState<string | undefined>(undefined);
  const conversationId = _conversationId || tempConversationId;
  const selectedConversation = conversations.find((c) => c.id === conversationId);
  const [changedPrompt, setChangedPrompt] = useState<ParsedPrompt | undefined>(undefined);
  const { showModal } = useContext(ModalsContext);
  const [messages, setMessages] = useState<Message[] | undefined>(undefined);
  const [isMessageUpdating, setIsMessageUpdating] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({});
  const [errorMessage, setErrorMessage] = useState<{ [key: string]: string }>({});

  const { t } = useTranslation();

  const disabled = !activeModel;

  useEffect(() => {
    const getNewMessages = async () => {
      let newMessages: Message[] = [];
      if (conversationId && selectedConversation) {
        newMessages = await readConversationMessages(selectedConversation.id, []);
        const stream = backendContext.streams?.[conversationId as string];
        newMessages = newMessages.filter((m) => !(m.author.role === 'system'));
        newMessages = newMessages.map((msg, index) => {
          if (stream && index === newMessages.length - 1) {
            return {
              ...msg,
              status: 'stream',
              content: stream.content.join(''),
              contentHistory: undefined,
            } as Message;
          }
          return { ...msg, conversationId };
        });
      }
      setMessages(newMessages);
      setIsMessageUpdating(false);
    };
    if (isMessageUpdating) {
      return;
    }
    logger.info('getNewMessages', conversationId, selectedConversation, isMessageUpdating);
    setIsMessageUpdating(true);
    getNewMessages();
  }, [
    backendContext.streams,
    conversationId,
    filterConversationMessages,
    readConversationMessages,
    isMessageUpdating,
    selectedConversation,
  ]);

  const tempConversationName = messages?.[0]?.content as string;

  const selectedModelNameOrId = getConversationModelId(selectedConversation) || activeModel;

  const { modelItems, commandManager } = useMemo(() => {
    const items = getModelsAsItems(providers, backendContext, selectedModelNameOrId);
    const manager = getCommandManager(items);
    return { modelItems: items, commandManager: manager };
  }, [backendContext, providers, selectedModelNameOrId]);

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

  const tokenValidator = useCallback(
    (
      token: PromptToken,
      parsedPrompt: ParsedPrompt,
      _previousToken: PromptToken | undefined,
    ): [PromptToken, PromptToken | undefined] =>
      validator(commandManager, token, parsedPrompt, _previousToken),
    [commandManager],
  );

  const currentPrompt = useMemo(
    () => toPrompt(selectedConversation?.currentPrompt || '', tokenValidator),
    [selectedConversation?.currentPrompt, tokenValidator],
  );

  const parseAndValidatePrompt = (text: string, caretStartIndex = 0) =>
    parsePrompt({ text, caretStartIndex }, tokenValidator);

  const handleChangeService = async (
    model?: string,
    provider = ProviderType.opla,
    partial: Partial<Conversation> = {},
  ) => {
    logger.info(
      `handleChangeService ${model} ${provider} activeModel=${typeof activeModel}`,
      selectedConversation,
    );
    const newService: AIService = {
      type: AIServiceType.Model,
      modelId: model as string,
      providerType: provider,
    };
    if (model && selectedConversation) {
      const services = addService(selectedConversation.services, newService);
      const newConversations = updateConversation(
        { ...selectedConversation, services, parameters: {}, ...partial },
        conversations,
        true,
      );
      updateConversations(newConversations);
    } else if (model && !activeModel) {
      await setActiveModel(model);
    } else if (model) {
      setService(newService);
    }
  };

  const sendMessage = async (
    message: Message,
    conversationMessages: Message[],
    conversation: Conversation,
    updatedConversations: Conversation[],
  ) => {
    const returnedMessage = { ...message };
    const activeService = getActiveService(
      conversation,
      assistant,
      providers,
      activeModel,
      backendContext,
      message.author.name,
    );
    logger.info('sendMessage', activeService, conversation, presets);

    try {
      const response = await completion(
        activeService,
        message,
        conversationMessages,
        conversation,
        presets,
      );
      setUsage(response.usage);
      returnedMessage.content = response.content.trim();
    } catch (e: any) {
      logger.error('sendMessage', e, typeof e);
      const error = String(e);
      onError(error);
      setErrorMessage({ ...errorMessage, [conversation.id]: error });
      returnedMessage.content = t('Oops, something went wrong.');
      returnedMessage.status = MessageStatus.Error;
      const { provider } = activeService;
      if (provider) {
        const { errors = [] } = provider || { errors: [] };
        const len = errors.unshift(error);
        if (len > 50) {
          errors.pop();
        }
        provider.errors = errors;
        const updatedProviders = providers.map((p) => (p.id === provider?.id ? provider : p));
        setProviders(updatedProviders);
      }

      toast.error(String(e));
    }
    returnedMessage.status = MessageStatus.Delivered;

    await updateMessagesAndConversation(
      [returnedMessage],
      conversationMessages,
      conversation.name,
      conversation.id,
      updatedConversations,
    );
    return returnedMessage;
  };

  const clearPrompt = (
    conversation: Conversation | undefined,
    newConversations = conversations,
  ) => {
    setChangedPrompt(undefined);

    let updatedConversations = newConversations;
    if (conversation) {
      updatedConversations = updateConversation(
        { ...conversation, currentPrompt: undefined, temp: false },
        newConversations,
      );
      updateConversations(updatedConversations);
    }
    return updatedConversations;
  };

  const handleSendMessage = async () => {
    if (conversationId === undefined) {
      return;
    }

    const mentions = currentPrompt.tokens.filter((to) => to.type === PromptTokenType.Mention);
    const modelItem =
      mentions.length === 1
        ? modelItems.find((mi) => compareMentions(mi.value, mentions[0].value))
        : undefined;
    const modelName = modelItem?.value;

    const action = currentPrompt.tokens.find((to) => to.type === PromptTokenType.Action);

    if (action) {
      let updatedConversation = selectedConversation;
      let updatedConversations = conversations;
      const command = commandManager.getCommand(action.value, action.type);
      if (command) {
        command.execute?.(action.value);
        if (command.label === 'System') {
          const message = createMessage(
            { role: 'system', name: 'system' },
            currentPrompt.text,
            currentPrompt.raw,
          );
          let updatedConversationId: string | undefined;
          ({ updatedConversationId, updatedConversations } = await updateMessagesAndConversation(
            [message],
            getConversationMessages(conversationId),
            tempConversationName,
            conversationId,
          ));

          updatedConversation = getConversation(
            updatedConversationId,
            updatedConversations,
          ) as Conversation;
        } else if (command.label === 'Imagine') {
          const userMessage = createMessage(
            { role: 'user', name: 'You' },
            currentPrompt.raw,
            currentPrompt.raw,
          );
          const message = createMessage(
            { role: 'assistant', name: modelName || selectedModelNameOrId },
            t("Soon, I'll be able to imagine wonderfull images..."),
          );
          let updatedConversationId: string | undefined;
          ({ updatedConversationId, updatedConversations } = await updateMessagesAndConversation(
            [userMessage, message],
            getConversationMessages(conversationId),
            tempConversationName,
            conversationId,
          ));

          updatedConversation = getConversation(
            updatedConversationId,
            updatedConversations,
          ) as Conversation;
        }
      }
      clearPrompt(updatedConversation, updatedConversations);
      return;
    }

    if (currentPrompt.text.length < 1) {
      if (modelName) {
        // Change conversation's model if there is only a model mention in the prompt
        // TODO handle parameters and key
        handleChangeService(modelName, modelItem.group as ProviderType, {
          currentPrompt: undefined,
        });
        setChangedPrompt(undefined);
        return;
      }
      const error = { ...errorMessage, [conversationId]: t('Please enter a message.') };
      setErrorMessage(error);
      return;
    }

    if (mentions.length > 1) {
      const error = { ...errorMessage, [conversationId]: t('Only one model at a time.') };
      setErrorMessage(error);
      return;
    }
    if (mentions.length === 1 && (!modelName || mentions[0].state === PromptTokenState.Error)) {
      const error = { ...errorMessage, [conversationId]: t('This model is not available.') };
      setErrorMessage(error);
      return;
    }

    setErrorMessage({ ...errorMessage, [conversationId]: '' });
    setIsProcessing({ ...isProcessing, [conversationId]: true });

    const userMessage = createMessage(
      { role: 'user', name: 'you' },
      currentPrompt.text,
      currentPrompt.raw,
    );
    let message = createMessage(
      { role: 'assistant', name: modelName || selectedModelNameOrId },
      '...',
    );
    message.status = MessageStatus.Pending;
    userMessage.sibling = message.id;
    message.sibling = userMessage.id;

    const {
      updatedConversationId,
      updatedConversations: uc,
      updatedMessages,
    } = await updateMessagesAndConversation(
      [userMessage, message],
      getConversationMessages(conversationId),
      tempConversationName,
      conversationId,
    );
    let updatedConversations = uc;

    const conversation: Conversation = getConversation(
      updatedConversationId,
      updatedConversations,
    ) as Conversation;
    if (conversation.temp) {
      conversation.name = getConversationTitle(conversation);
    }

    updatedConversations = clearPrompt(conversation, updatedConversations);

    logger.info('onSendMessage', updatedMessages, conversation);
    message = await sendMessage(message, updatedMessages, conversation, updatedConversations);

    if (tempConversationId) {
      router.push(`${Page.Threads}/${tempConversationId}`);
    }

    setIsProcessing({ ...isProcessing, [conversationId]: false });
  };

  const handleResendMessage = async (
    previousMessage: Message,
    conversationMessages = getConversationMessages(conversationId),
  ) => {
    if (conversationId === undefined) {
      return;
    }
    setErrorMessage({ ...errorMessage, [conversationId]: '' });
    setIsProcessing({ ...isProcessing, [conversationId]: true });

    let message: Message = changeMessageContent(
      previousMessage,
      '...',
      '...',
      MessageStatus.Pending,
    );

    const { updatedConversationId, updatedConversations, updatedMessages } =
      await updateMessagesAndConversation(
        [message],
        conversationMessages,
        tempConversationName,
        conversationId,
      );

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
          const updatedMessages = filterConversationMessages(
            conversationId,
            (m) => m.id !== message.id && m.id !== message.sibling,
          );
          updateConversationMessages(conversationId, updatedMessages);
          if (message.assets) {
            conversation.assets = getConversationAssets(conversation).filter(
              (a: Asset) => !message.assets?.find((ma: string) => ma === a.id),
            );
          }
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

  const handleShouldDeleteAssets = (message: Message) => {
    showModal(ModalIds.DeleteItem, {
      title: 'Delete this message and assets ?',
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
    if (conversation && message.content) {
      const parsedContent = parseAndValidatePrompt(newContent); // parsePrompt({ text: newContent }, tokenValidator);
      const newMessage = changeMessageContent(message, parsedContent.text, parsedContent.raw);
      const conversationMessages = getConversationMessages(conversationId);
      const newMessages = conversationMessages.map((m) => {
        if (m.id === message.id) {
          return newMessage;
        }
        return m;
      });
      const { updatedMessages } = await updateMessagesAndConversation(
        newMessages,
        conversationMessages,
        tempConversationName,
        conversationId,
        conversations,
      );

      if (submit) {
        const sibling = updatedMessages.find((m) => m.id === message.sibling);
        if (sibling) {
          await handleResendMessage(sibling, updatedMessages);
        }
      }
    }
  };

  const handleUpdatePrompt = useCallback(
    (prompt: ParsedPrompt | undefined, conversationName = 'Conversation') => {
      if (prompt?.raw === '' && tempConversationId) {
        setChangedPrompt(undefined);
        updateConversations(conversations.filter((c) => !c.temp));
        setTempConversationId(undefined);
        return;
      }
      const conversation = getConversation(conversationId, conversations) as Conversation;
      if (conversation && comparePrompts(conversation.currentPrompt, prompt)) {
        setChangedPrompt(undefined);
        return;
      }
      let updatedConversations: Conversation[];
      if (conversation) {
        conversation.currentPrompt = prompt;
        updatedConversations = conversations.filter((c) => !(c.temp && c.id !== conversationId));
        updatedConversations = updateConversation(conversation, updatedConversations, true);
      } else {
        updatedConversations = conversations.filter((c) => !c.temp);
        const newConversation = createConversation('Conversation');
        updatedConversations.push(newConversation);
        newConversation.temp = true;
        newConversation.name = conversationName;
        newConversation.currentPrompt = prompt;
        if (service) {
          addConversationService(newConversation, service);
          setService(undefined);
        }
        setTempConversationId(newConversation.id);
      }
      updateConversations(updatedConversations);
      setChangedPrompt(undefined);
    },
    [tempConversationId, conversationId, conversations, updateConversations, service],
  );

  useDebounceFunc<ParsedPrompt | undefined>(handleUpdatePrompt, changedPrompt, 500);

  const handleChangePrompt = (prompt: ParsedPrompt) => {
    if (prompt.raw !== currentPrompt.raw) {
      setChangedPrompt(prompt);
    }
  };

  const prompt = changedPrompt === undefined ? currentPrompt : changedPrompt;
  return (
    <ContentView
      header={
        <ThreadMenu
          selectedAssistantId={assistantId}
          selectedModelName={selectedModelNameOrId}
          selectedConversationId={conversationId}
          modelItems={modelItems}
          onSelectModel={handleChangeService}
          onSelectMenu={onSelectMenu}
        />
      }
      toolbar={rightToolbar}
    >
      <ConversationPanel
        selectedConversation={selectedConversation}
        messages={messages}
        disabled={disabled}
        isPrompt={!!prompt}
        onResendMessage={handleResendMessage}
        onDeleteMessage={handleShouldDeleteMessage}
        onDeleteAssets={handleShouldDeleteAssets}
        onChangeMessageContent={handleChangeMessageContent}
        onSelectPrompt={handleUpdatePrompt}
        parseAndValidatePrompt={parseAndValidatePrompt}
      />
      {(prompt || (messages && messages[0]?.conversationId === conversationId)) && (
        <PromptArea
          conversationId={conversationId as string}
          disabled={disabled}
          commandManager={commandManager}
          prompt={prompt}
          isLoading={conversationId ? isProcessing[conversationId] : false}
          errorMessage={conversationId ? errorMessage[conversationId] : ''}
          onSendMessage={handleSendMessage}
          onUpdatePrompt={handleChangePrompt}
          tokenValidate={tokenValidator}
        />
      )}
    </ContentView>
  );
}

export default Thread;
