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
import {
  useAssistantStore,
  useModelsStore,
  useProviderStore,
  useThreadStore,
  useUsageStorage,
} from '@/stores';
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
  handleCancelSending: (conversationId: string, messageId: string | undefined) => void;
};

type ConversationProviderProps = {
  selectedConversation: Conversation | undefined;
  conversationId: string | undefined;
  messages: MessageImpl[] | undefined;
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
  const { setUsage } = useUsageStorage();
  const { providers } = useProviderStore();
  const {
    conversations,
    messages: messagesCache,
    updateConversationMessages,
    updateMessagesAndConversation,
  } = useThreadStore();
  const { parseAndValidatePrompt, clearPrompt } = useContext(PromptContext) || {};
  const { activeService, streams, server, updateBackendServer } = useBackend();
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

  const handleError = useCallback(
    (id: string, error: string) => {
      onError(id, error);
      setErrorMessage({ ...errorMessages, [id]: error });
    },
    [setErrorMessage, onError, errorMessages],
  );

  useEffect(() => {
    if (conversationId && streams?.[conversationId]) {
      const stream = streams[conversationId];
      if (stream.status === 'error') {
        const error = stream.content[0];
        handleError(conversationId, error);
        const model = modelStorage.items.find((m) => m.id === selectedModelId);
        if (model) {
          const stderr = server.stderr || [];
          const len = stderr.unshift(error);
          if (len > 50) {
            stderr.pop();
          }
          updateBackendServer({ stderr });
        }
      }
    }
  }, [
    conversationId,
    streams,
    handleError,
    modelStorage.items,
    selectedModelId,
    server.stderr,
    updateBackendServer,
  ]);

  const handleProcessing = useCallback(
    (id: string, state = false) => {
      if (isProcessing[id] !== state) {
        setIsProcessing({ ...isProcessing, [id]: state });
      }
    },
    [isProcessing],
  );

  const startProcessing = useCallback(
    (id: string) => {
      setIsProcessing({ ...isProcessing, [id]: true });
      const updatedErrors = { ...errorMessages };
      delete updatedErrors[id];
      setErrorMessage(updatedErrors);
    },
    [errorMessages, isProcessing],
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
          messagesCache[conversation.id],
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
          messagesCache[conversation.id],
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
    [messagesCache, updateMessagesAndConversation],
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

      let updatedMessages = messagesCache[conversation.id];
      let message = previousMessage;
      const openai = providers.find((p) => p.name.toLowerCase() === 'openai');
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
      providers,
      conversations,
      messagesCache,
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

      const updatedMessages = messagesCache[conversation.id];
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
    [clearPrompt, conversations, messagesCache, router, t, tempConversationId, updateMessages],
  );

  const preProcessingSendMessage = useCallback(
    async (
      prompt: ParsedPrompt,
      conversation: Conversation,
      previousMessage?: Message | undefined,
    ) => {
      if (!selectedModelId) {
        handleError(conversation.id, 'No model selected');
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
        {
          changeService,
          getConversationMessages: (id: string) => messagesCache[id],
          updateMessagesAndConversation,
          t,
          providers,
        },
      );
      if (result.type === 'error') {
        handleError(conversation.id, result.error);
        return {};
      }
      if (result.type === 'return') {
        clearPrompt?.(result.updatedConversation, result.updatedConversations);
        return {};
      }
      if (result.type === 'imagine') {
        startProcessing(conversation.id);
        try {
          await handleImageGeneration(prompt, conversation, previousMessage);
        } catch (error) {
          handleError(conversation.id, `${error}`);
        }
        setIsProcessing({ ...isProcessing, [conversation.id]: false });

        return {};
      }
      if (result.type === 'note') {
        startProcessing(conversation.id);
        try {
          await handleNote(prompt, conversation, previousMessage);
        } catch (error) {
          handleError(conversation.id, `${error}`);
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
        handleError(conversation.id, 'Model not found');
        setIsProcessing({ ...isProcessing, [conversation.id]: false });
      } else {
        startProcessing(conversation.id);
      }

      return { selectedModel, selectedAssistant };
    },
    [
      changeService,
      clearPrompt,
      commandManager,
      modelStorage,
      conversations,
      getAssistant,
      messagesCache,
      handleImageGeneration,
      handleNote,
      isProcessing,
      providers,
      selectedConversation,
      selectedModelId,
      t,
      tempConversationName,
      updateMessagesAndConversation,
      handleError,
      startProcessing,
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
        messagesCache[conversationId],
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
      conversationId,
      messagesCache,
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
      conversationMessages = conversationId ? messagesCache[conversationId] : undefined,
    ) => {
      if (conversationId === undefined || !parseAndValidatePrompt) {
        return;
      }
      const index = conversationMessages?.findIndex((m) => m.id === previousMessage.id);
      const prompt = parseAndValidatePrompt(
        index !== undefined && index > -1
          ? getMessageRawContentAsString(conversationMessages?.[index - 1]) || ''
          : '',
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
          messagesCache[conversationId],
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
      conversationId,
      messagesCache,
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
    async (cId: string, messageId: string | undefined) => {
      const cancelMessageSending = async (mId: string) => {
        if (selectedConversation && selectedModelId) {
          try {
            await cancelSending(
              mId,
              selectedConversation,
              selectedModelId,
              assistant,
              modelStorage,
              activeService,
            );
          } catch (e) {
            logger.error(e);
            const conversationMessages = messagesCache[selectedConversation.id];
            const previousMessage = conversationMessages.find((m) => m.id === mId);
            if (!previousMessage) {
              logger.error(
                "Can't find previous message",
                mId,
                selectedConversation,
                conversationMessages,
              );
              return;
            }
            const updatedMessage = changeMessageContent(
              previousMessage,
              t('Cancelled'),
              t('Cancelled'),
              MessageStatus.Delivered,
              true,
              undefined,
            );
            await updateConversationMessages(
              cId,
              messagesCache[cId].map((m) => (m.id === mId ? updatedMessage : m)),
            );
          }
        }
      };

      if (messageId) {
        await cancelMessageSending(messageId);
      }
      if (messagesCache[cId]) {
        const promises = messagesCache[cId]
          .map((message) => {
            if (
              messageId !== message.id &&
              (message.status === 'pending' || message.status === 'stream')
            ) {
              return cancelMessageSending(message.id);
            }
            return undefined;
          })
          .filter((p) => !!p);
        await Promise.all(promises);
      }
    },
    [
      assistant,
      activeService,
      modelStorage,
      selectedConversation,
      selectedModelId,
      t,
      messagesCache,
      updateConversationMessages,
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
      );
      if (updatedMessages && submit) {
        const sibling = updatedMessages.find((m) => m.id === message.sibling);
        if (sibling) {
          await handleResendMessage(sibling, updatedMessages);
        }
      }
    },
    [conversationId, handleResendMessage, parseAndValidatePrompt, tempConversationName],
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
      isProcessing,
      handleProcessing,
      handleSendMessage,
      handleResendMessage,
      handleChangeMessageContent,
      handleStartMessageEdit,
      handleCancelSending,
      errorMessages,
    }),
    [
      selectedMessageId,
      handleProcessing,
      handleChangeMessageContent,
      handleResendMessage,
      handleSendMessage,
      handleStartMessageEdit,
      handleCancelSending,
      isProcessing,
      errorMessages,
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
