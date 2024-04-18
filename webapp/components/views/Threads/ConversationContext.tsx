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

import {
  PropsWithChildren,
  createContext,
  useMemo,
  useContext,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/router';
import { AppContext } from '@/context';
import { Conversation, Message, MessageStatus, MessageImpl, Assistant } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { getConversationModelId } from '@/utils/data/conversations';
import useBackend from '@/hooks/useBackendContext';
import { findModelInAll } from '@/utils/data/models';
import { Page } from '@/types/ui';
import { ParsedPrompt } from '@/utils/parsers';
import { getConversationTitle } from '@/utils/conversations';
import {
  createMessage,
  changeMessageContent,
  getMessageRawContentAsString,
} from '@/utils/data/messages';
import { preProcessingCommands } from '@/utils/commands';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import { CommandManager } from '@/utils/commands/types';
import { sendMessage, updateMessageContent } from '@/utils/messages';
import { PromptContext } from './Prompt/PromptContext';

type Context = {
  selectedMessageId: string | undefined;
  isProcessing: { [key: string]: boolean };
  errorMessages: { [key: string]: string };
  handleSendMessage: (prompt: ParsedPrompt | undefined) => Promise<void>;
  handleResendMessage: (
    previousMessage: Message,
    conversationMessages?: Message[],
  ) => Promise<void>;
  handleChangeMessageContent: (
    message: Message,
    newContent: string,
    submit: boolean,
  ) => Promise<void>;
  handleStartMessageEdit: (messageId: string, index: number) => void;
};

type ConversationProviderProps = {
  selectedConversation: Conversation | undefined;
  conversationId: string | undefined;
  messages: MessageImpl[];
  commandManager: CommandManager;
  assistant: Assistant | undefined;
  selectedModelId: string | undefined;
  tempConversationName: string | undefined;
  tempConversationId: string | undefined;

  changeService: (
    modelIdOrName: string,
    providerIdOrName: string,
    partial: Partial<Conversation>,
  ) => Promise<void>;
  onError: (conversationId: string, error: string) => void;
};

const ConversationContext = createContext<Context | undefined>(undefined);

function ConversationProvider({
  selectedConversation,
  conversationId,
  messages,
  commandManager,
  assistant,
  selectedModelId,
  tempConversationName,
  tempConversationId,
  changeService,
  onError,
  children,
}: PropsWithChildren<ConversationProviderProps>) {
  const router = useRouter();
  const context = useContext(AppContext);
  const {
    providers,
    conversations,
    getConversationMessages,
    updateMessagesAndConversation,
    setUsage,
  } = context;
  const { parseAndValidatePrompt, clearPrompt } = useContext(PromptContext) || {};
  const { config } = useBackend();
  const [selectedMessageId, setSelectedMessageId] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({});
  const [errorMessages, setErrorMessage] = useState<{ [key: string]: string }>({});

  const { t } = useTranslation();

  const handleError = useCallback(
    (id: string, error: string) => {
      onError(id, error);
      setErrorMessage({ ...errorMessages, [id]: error });
    },
    [errorMessages, onError],
  );

  const preProcessingSendMessage = useCallback(
    async (
      prompt: ParsedPrompt,
      conversation: Conversation,
      previousMessage?: Message | undefined,
    ) => {
      if (!selectedModelId) {
        setErrorMessage({ type: 'error', error: 'No model selected' });
        return undefined;
      }
      const result = await preProcessingCommands(
        conversation.id,
        prompt,
        commandManager,
        conversation,
        conversations,
        tempConversationName || '',
        selectedModelId,
        previousMessage,
        { changeService, getConversationMessages, updateMessagesAndConversation, t },
      );
      if (result.type === 'error') {
        setErrorMessage({ ...errorMessages, [conversation.id]: result.error });
        return undefined;
      }
      if (result.type === 'return') {
        clearPrompt?.(result.updatedConversation, result.updatedConversations);
        return undefined;
      }

      let selectedModel;
      if (result.modelName) {
        selectedModel = findModelInAll(result.modelName, providers, config, true);
      } else {
        selectedModel = findModelInAll(
          getConversationModelId(selectedConversation) || selectedModelId,
          providers,
          config,
          true,
        );
      }
      if (!selectedModel) {
        setErrorMessage({ ...errorMessages, [conversation.id]: 'Model not found' });
        setIsProcessing({ ...isProcessing, [conversation.id]: false });
      } else {
        setErrorMessage({ ...errorMessages, [conversation.id]: '' });
        setIsProcessing({ ...isProcessing, [conversation.id]: true });
      }

      return selectedModel;
    },
    [
      changeService,
      clearPrompt,
      commandManager,
      config,
      conversations,
      errorMessages,
      getConversationMessages,
      isProcessing,
      providers,
      selectedConversation,
      selectedModelId,
      t,
      tempConversationName,
      updateMessagesAndConversation,
    ],
  );

  const handleSendMessage = useCallback(
    async (prompt: ParsedPrompt | undefined) => {
      if (!prompt || conversationId === undefined || !selectedConversation) {
        return;
      }

      const selectedModel = await preProcessingSendMessage(
        prompt,
        selectedConversation as Conversation,
      );
      if (!selectedModel) {
        return;
      }

      const userMessage = createMessage({ role: 'user', name: 'you' }, prompt.text, prompt.raw);
      let message = createMessage({ role: 'assistant', name: selectedModel.name }, '...');
      message.author.metadata = { ...message.author.metadata, modelId: selectedModel.id };
      if (assistant) {
        message.author.metadata.assistantId = assistant.id;
      }
      message.status = MessageStatus.Pending;
      userMessage.sibling = message.id;
      message.sibling = userMessage.id;

      const {
        updatedConversation,
        updatedConversations: uc,
        updatedMessages,
      } = await updateMessagesAndConversation(
        [userMessage, message],
        getConversationMessages(conversationId),
        { name: tempConversationName },
        conversationId,
      );
      let updatedConversations = uc;
      if (updatedConversation.temp) {
        updatedConversation.name = getConversationTitle(updatedConversation, t);
      }

      if (clearPrompt) {
        updatedConversations = clearPrompt(updatedConversation, updatedConversations);
      }

      logger.info(
        'onSendMessage',
        selectedModel,
        selectedModelId,
        updatedMessages,
        updatedConversation,
      );
      message = await sendMessage(
        message,
        updatedMessages,
        updatedConversation,
        updatedConversations,
        prompt,
        selectedModel.name as string,
        assistant,
        commandManager,
        context,
        config,
        setUsage,
        handleError,
      );

      if (tempConversationId) {
        router.replace(`${Page.Threads}/${tempConversationId}`, undefined, { shallow: true });
      }

      setIsProcessing({ ...isProcessing, [conversationId]: false });
    },
    [
      assistant,
      clearPrompt,
      commandManager,
      config,
      context,
      conversationId,
      getConversationMessages,
      handleError,
      isProcessing,
      preProcessingSendMessage,
      router,
      selectedConversation,
      selectedModelId,
      setUsage,
      t,
      tempConversationId,
      tempConversationName,
      updateMessagesAndConversation,
    ],
  );

  const handleResendMessage = useCallback(
    async (
      previousMessage: Message,
      conversationMessages = getConversationMessages(conversationId),
    ) => {
      if (conversationId === undefined || !parseAndValidatePrompt) {
        return;
      }
      const index = conversationMessages.findIndex((m) => m.id === previousMessage.id);
      const prompt = parseAndValidatePrompt(
        getMessageRawContentAsString(conversationMessages[index - 1]) || '',
      );
      const selectedModel = await preProcessingSendMessage(
        prompt,
        selectedConversation as Conversation,
        previousMessage,
      );
      if (!selectedModel) {
        return;
      }

      let message: Message = changeMessageContent(
        previousMessage,
        '...',
        '...',
        MessageStatus.Pending,
      );
      if (message.author.name !== selectedModel.name) {
        message.author.name = selectedModel.name;
        message.author.metadata = { ...message.author.metadata, modelId: selectedModel.id };
        if (assistant) {
          message.author.metadata.assistantId = assistant.id;
        }
      }
      const { updatedConversation, updatedConversations, updatedMessages } =
        await updateMessagesAndConversation(
          [message],
          conversationMessages,
          { name: tempConversationName },
          conversationId,
        );

      message = await sendMessage(
        message,
        updatedMessages,
        updatedConversation,
        updatedConversations,
        prompt,
        selectedModel.name as string,
        assistant,
        commandManager,
        context,
        config,
        setUsage,
        handleError,
      );

      setIsProcessing({ ...isProcessing, [conversationId]: false });
    },
    [
      assistant,
      commandManager,
      config,
      context,
      conversationId,
      getConversationMessages,
      handleError,
      isProcessing,
      parseAndValidatePrompt,
      preProcessingSendMessage,
      selectedConversation,
      setUsage,
      tempConversationName,
      updateMessagesAndConversation,
    ],
  );

  const handleChangeMessageContent = useCallback(
    async (message: Message, newContent: string, submit: boolean) => {
      if (conversationId === undefined || !parseAndValidatePrompt) {
        return;
      }

      const parsedContent = parseAndValidatePrompt(newContent);
      const updatedMessages = await updateMessageContent(
        message,
        parsedContent,
        conversationId,
        tempConversationName,
        context,
      );
      if (updatedMessages && submit) {
        const sibling = updatedMessages.find((m) => m.id === message.sibling);
        if (sibling) {
          await handleResendMessage(sibling, updatedMessages);
        }
      }
    },
    [context, conversationId, handleResendMessage, parseAndValidatePrompt, tempConversationName],
  );

  const handleStartMessageEdit = useCallback(
    (messageId: string, index: number) => {
      const messageIndex = messages?.findIndex((m) => m.id === messageId);
      if (messageIndex === index) {
        setSelectedMessageId(undefined);
      }
    },
    [messages],
  );

  useShortcuts(ShortcutIds.EDIT_MESSAGE, (e) => {
    e.preventDefault();
    const lastMessage = messages?.findLast((m) => m.author.role === 'user');
    logger.info('shortcut #edit-message', lastMessage);
    if (lastMessage && lastMessage.id !== selectedMessageId) {
      setSelectedMessageId(lastMessage.id);
    }
  });

  useShortcuts(ShortcutIds.RESEND_MESSAGE, (e) => {
    e.preventDefault();
    const lastMessage = messages?.findLast((m) => m.author.role === 'assistant');

    logger.info('shortcut #resend-message', lastMessage);
    if (lastMessage) {
      handleResendMessage(lastMessage);
    }
  });

  const value = useMemo(
    () => ({
      selectedMessageId,
      errorMessages,
      isProcessing,
      handleSendMessage,
      handleResendMessage,
      handleChangeMessageContent,
      handleStartMessageEdit,
    }),
    [
      selectedMessageId,
      errorMessages,
      handleChangeMessageContent,
      handleResendMessage,
      handleSendMessage,
      handleStartMessageEdit,
      isProcessing,
    ],
  );
  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

const useConversationContext = (): Context => {
  const context = useContext(ConversationContext);
  if (!context) {
    logger.error('ConversationContext not set');
    return {
      selectedMessageId: undefined,
      isProcessing: {},
      errorMessages: {},
      handleSendMessage: async () => {},
      handleResendMessage: async () => {},
      handleChangeMessageContent: async () => {},
      handleStartMessageEdit: () => {},
    };
  }
  return context;
};
export { ConversationProvider, ConversationContext, useConversationContext };
