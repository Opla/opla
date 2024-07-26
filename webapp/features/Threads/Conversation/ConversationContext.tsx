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
  useEffect,
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
import { cancelSending, sendMessage, updateMessageContent } from '@/utils/messages';
import { useAssistantStore, useModelsStore } from '@/stores';
import { imageGeneration } from '@/utils/providers';
import { convertAssetFile } from '@/utils/backend/tauri';
import { PromptContext } from '../Prompt/PromptContext';

type Context = {
  selectedMessageId: string | undefined;
  isProcessing: { [key: string]: boolean };
  errorMessages: { [key: string]: string };
  handleProcessing: (id: string, state?: boolean) => void;
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
  handleCancelSending: (messageId: string) => void;
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
  processing: boolean;
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
  processing,
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
  const { activeService } = useBackend();
  const { getAssistant } = useAssistantStore();
  const modelStorage = useModelsStore();
  const [selectedMessageId, setSelectedMessageId] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({});
  const [errorMessages, setErrorMessage] = useState<{ [key: string]: string }>({});

  const { t } = useTranslation();

  useEffect(() => {
    if (conversationId && processing !== isProcessing[conversationId]) {
      setIsProcessing({ ...isProcessing, [conversationId]: processing });
    }
  }, [conversationId, processing, isProcessing, setIsProcessing]);

  const handleProcessing = useCallback(
    (id: string, state = false) => {
      if (isProcessing[id] !== state) {
        setIsProcessing({ ...isProcessing, [id]: state });
      }
    },
    [isProcessing],
  );

  const handleError = useCallback(
    (id: string, error: string) => {
      onError(id, error);
      setErrorMessage({ ...errorMessages, [id]: error });
    },
    [errorMessages, onError],
  );

  const updateMessages = useCallback(
    async (
      raw: string,
      content: string,
      status: MessageStatus,
      conversationMessages: Message[],
      conversation: Conversation,
      previousMessage: Message | undefined,
      authorName: string,
    ) => {
      let updatedConversation = conversation;
      let updatedMessages: Message[] | undefined;
      let message;
      if (previousMessage) {
        message = changeMessageContent(previousMessage, content);
        message.status = status;
        ({ updatedConversation, updatedMessages } = await updateMessagesAndConversation(
          [message],
          conversationMessages,
          updatedConversation,
          conversation.id,
        ));
      } else if (authorName === 'Note') {
        message = createMessage({ role: 'note', name: authorName }, content);
        message.status = status;
        ({ updatedConversation, updatedMessages } = await updateMessagesAndConversation(
          [message],
          getConversationMessages(conversation.id),
          conversation,
          conversation.id,
        ));
      } else {
        const userMessage = createMessage({ role: 'user', name: 'You' }, raw, raw);
        message = createMessage({ role: 'assistant', name: authorName || 'Assistant' }, content);
        message.status = status;
        userMessage.sibling = message.id;
        message.sibling = userMessage.id;
        ({ updatedConversation, updatedMessages } = await updateMessagesAndConversation(
          [userMessage, message],
          getConversationMessages(conversation.id),
          conversation,
          conversation.id,
        ));
      }
      return {
        updatedConversation,
        updatedMessages,
        message,
      };
    },
    [getConversationMessages, updateMessagesAndConversation],
  );

  const handleImageGeneration = useCallback(
    async (
      prompt: ParsedPrompt,
      conversation: Conversation,
      previousMessage?: Message | undefined,
    ) => {
      let updatedConversation = conversation;

      if (!previousMessage) {
        updatedConversation =
          (await clearPrompt?.(conversation, conversations))?.find(
            (c) => c.id === conversation.id,
          ) || conversation;
      }
      if (updatedConversation.temp) {
        updatedConversation.name = getConversationTitle(updatedConversation, t);
      }

      let updatedMessages = getConversationMessages(conversation.id);
      let message = previousMessage;
      const openai = context.providers.find((p) => p.name.toLowerCase() === 'openai');
      let content: string | undefined;
      let modelName: string | undefined;
      if (openai) {
        modelName = 'Dall-E'; // TODO remove hardcoding
        ({ updatedConversation, updatedMessages, message } = await updateMessages(
          prompt.raw,
          '...',
          MessageStatus.Pending,
          updatedMessages,
          updatedConversation,
          message,
          modelName || 'Image Gen',
        ));
        const { text } = prompt;
        const response = await imageGeneration(openai, text);

        if (response?.images[0]) {
          const assetUrl = await convertAssetFile(response.images[0]);
          content = `![${text}](${assetUrl} "${text}")`;
        }
      }
      await updateMessages(
        prompt.raw,
        content || t('Not available for this AI provider'),
        MessageStatus.Delivered,
        updatedMessages,
        updatedConversation,
        message,
        modelName || 'Image Gen',
      );

      if (tempConversationId) {
        router.replace(`${Page.Threads}/${tempConversationId}`, undefined, { shallow: true });
      }
    },
    [
      clearPrompt,
      context.providers,
      conversations,
      getConversationMessages,
      router,
      t,
      tempConversationId,
      updateMessages,
    ],
  );

  const handleNote = useCallback(
    async (
      prompt: ParsedPrompt,
      conversation: Conversation,
      previousMessage?: Message | undefined,
    ) => {
      let updatedConversation = conversation;

      if (!previousMessage) {
        updatedConversation =
          (await clearPrompt?.(conversation, conversations))?.find(
            (c) => c.id === conversation.id,
          ) || conversation;
      }
      if (updatedConversation.temp) {
        updatedConversation.name = getConversationTitle(updatedConversation, t);
      }

      const updatedMessages = getConversationMessages(conversation.id);
      const message = previousMessage;
      await updateMessages(
        prompt.raw,
        prompt.text,
        MessageStatus.Delivered,
        updatedMessages,
        updatedConversation,
        message,
        'Note',
      );
      if (tempConversationId) {
        router.replace(`${Page.Threads}/${tempConversationId}`, undefined, { shallow: true });
      }
    },
    [
      clearPrompt,
      conversations,
      getConversationMessages,
      router,
      t,
      tempConversationId,
      updateMessages,
    ],
  );

  const preProcessingSendMessage = useCallback(
    async (
      prompt: ParsedPrompt,
      conversation: Conversation,
      previousMessage?: Message | undefined,
    ) => {
      if (!selectedModelId) {
        setErrorMessage({ type: 'error', error: 'No model selected' });
        return {};
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
        { changeService, getConversationMessages, updateMessagesAndConversation, t, providers },
      );
      if (result.type === 'error') {
        setErrorMessage({ ...errorMessages, [conversation.id]: result.error });
        return {};
      }
      if (result.type === 'return') {
        clearPrompt?.(result.updatedConversation, result.updatedConversations);
        return {};
      }
      if (result.type === 'imagine') {
        setIsProcessing({ ...isProcessing, [conversation.id]: true });
        try {
          await handleImageGeneration(prompt, conversation, previousMessage);
        } catch (error) {
          setErrorMessage({ ...errorMessages, [conversation.id]: `${error}` });
        }
        setIsProcessing({ ...isProcessing, [conversation.id]: false });

        return {};
      }
      if (result.type === 'note') {
        setIsProcessing({ ...isProcessing, [conversation.id]: true });
        try {
          await handleNote(prompt, conversation, previousMessage);
        } catch (error) {
          setErrorMessage({ ...errorMessages, [conversation.id]: `${error}` });
        }
        setIsProcessing({ ...isProcessing, [conversation.id]: false });

        return {};
      }

      let selectedAssistant: Assistant | undefined;
      if (result.assistantId) {
        selectedAssistant = getAssistant(result.assistantId);
      }
      let selectedModel;
      if (result.modelName) {
        selectedModel = findModelInAll(result.modelName, providers, modelStorage, true);
      } else {
        selectedModel = findModelInAll(
          getConversationModelId(selectedConversation) || selectedModelId,
          providers,
          modelStorage,
          true,
        );
      }
      if (!selectedModel && !selectedAssistant) {
        setErrorMessage({ ...errorMessages, [conversation.id]: 'Model not found' });
        setIsProcessing({ ...isProcessing, [conversation.id]: false });
      } else {
        setErrorMessage({ ...errorMessages, [conversation.id]: '' });
        setIsProcessing({ ...isProcessing, [conversation.id]: true });
      }

      return { selectedModel, selectedAssistant };
    },
    [
      changeService,
      clearPrompt,
      commandManager,
      modelStorage,
      conversations,
      errorMessages,
      getAssistant,
      getConversationMessages,
      handleImageGeneration,
      handleNote,
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

      const { selectedModel, selectedAssistant } = await preProcessingSendMessage(
        prompt,
        selectedConversation,
      );
      if (!selectedModel) {
        return;
      }

      const userMessage = createMessage({ role: 'user', name: 'you' }, prompt.text, prompt.raw);
      const message = createMessage({ role: 'assistant', name: selectedModel?.name }, '...');
      message.author.metadata = { ...message.author.metadata, modelId: selectedModel?.id };
      if (selectedAssistant) {
        message.author.metadata = { ...message.author.metadata, assistantId: selectedAssistant.id };
      } else if (assistant) {
        message.author.metadata = { ...message.author.metadata, assistantId: assistant.id };
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
        updatedConversations = await clearPrompt(updatedConversation, updatedConversations);
      }

      logger.info(
        'onSendMessage',
        selectedModel,
        selectedModelId,
        updatedMessages,
        updatedConversation,
        message,
        userMessage,
      );
      await sendMessage(
        message,
        updatedMessages,
        updatedConversation,
        updatedConversations,
        prompt,
        selectedModel?.name,
        selectedAssistant || assistant,
        commandManager,
        context,
        modelStorage,
        activeService,
        setUsage,
        handleError,
      );

      if (tempConversationId) {
        router.replace(`${Page.Threads}/${tempConversationId}`, undefined, { shallow: true });
      }
    },
    [
      assistant,
      clearPrompt,
      commandManager,
      activeService,
      modelStorage,
      context,
      conversationId,
      getConversationMessages,
      handleError,
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
      const { selectedModel, selectedAssistant } = await preProcessingSendMessage(
        prompt,
        selectedConversation as Conversation,
        previousMessage,
      );
      if (!selectedModel) {
        return;
      }

      const message: Message = changeMessageContent(
        previousMessage,
        '...',
        '...',
        MessageStatus.Pending,
      );
      if (selectedModel && message.author.name !== selectedModel.name) {
        message.author.name = selectedModel.name;
        message.author.metadata = { ...message.author.metadata, modelId: selectedModel.id };
        if (assistant) {
          message.author.metadata.assistantId = assistant.id;
        }
      }
      if (selectedAssistant && message.author.metadata?.assistantId !== selectedAssistant.id) {
        message.author.metadata = { ...message.author.metadata, assistantId: selectedAssistant.id };
      }
      const { updatedConversation, updatedConversations, updatedMessages } =
        await updateMessagesAndConversation(
          [message],
          conversationMessages,
          { name: tempConversationName },
          conversationId,
        );

      await sendMessage(
        message,
        updatedMessages,
        updatedConversation,
        updatedConversations,
        prompt,
        selectedModel?.name,
        selectedAssistant || assistant,
        commandManager,
        context,
        modelStorage,
        activeService,
        setUsage,
        handleError,
      );
    },
    [
      assistant,
      commandManager,
      activeService,
      modelStorage,
      context,
      conversationId,
      getConversationMessages,
      handleError,
      parseAndValidatePrompt,
      preProcessingSendMessage,
      selectedConversation,
      setUsage,
      tempConversationName,
      updateMessagesAndConversation,
    ],
  );

  const handleCancelSending = useCallback(
    async (messageId: string) => {
      if (selectedConversation && selectedModelId) {
        try {
          await cancelSending(
            messageId,
            selectedConversation,
            selectedModelId,
            assistant,
            context,
            modelStorage,
            activeService,
          );
        } catch (e) {
          logger.error(e);
          const conversationMessages = getConversationMessages(selectedConversation.id);
          const previousMessage = conversationMessages.find((m) => m.id === messageId);
          if (!previousMessage) {
            logger.error(
              "Can't find previous message",
              messageId,
              selectedConversation,
              conversationMessages,
            );
            return;
          }
          changeMessageContent(
            previousMessage,
            t('Cancelled'),
            t('Cancelled'),
            MessageStatus.Delivered,
          );
        }
      }
    },
    [
      assistant,
      activeService,
      modelStorage,
      context,
      selectedConversation,
      selectedModelId,
      t,
      getConversationMessages,
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
      handleProcessing,
      handleSendMessage,
      handleResendMessage,
      handleChangeMessageContent,
      handleStartMessageEdit,
      handleCancelSending,
    }),
    [
      selectedMessageId,
      errorMessages,
      handleProcessing,
      handleChangeMessageContent,
      handleResendMessage,
      handleSendMessage,
      handleStartMessageEdit,
      handleCancelSending,
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
      handleProcessing: () => {},
      handleSendMessage: async () => {},
      handleResendMessage: async () => {},
      handleChangeMessageContent: async () => {},
      handleStartMessageEdit: () => {},
      handleCancelSending: () => {},
    };
  }
  return context;
};
export { ConversationProvider, ConversationContext, useConversationContext };
