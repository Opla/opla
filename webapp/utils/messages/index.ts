// Copyright 2024 Mik Bry
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
  AIService,
  Assistant,
  Conversation,
  LlmUsage,
  Message,
  MessageStatus,
  ModelsConfiguration,
} from '@/types';
import { toast } from '@/components/ui/Toast';
import { usePresetStore, useProviderStore, useThreadStore } from '@/stores';
import { CommandManager } from '../commands/types';
import logger from '../logger';
import { ParsedPrompt } from '../parsers';
import { getActiveService } from '../services';
import { cancelCompletion, completion } from '../providers';
import { getConversation } from '../data/conversations';
import { changeMessageContent } from '../data/messages';

export const updateMessageContent = async (
  message_or_id: Message | string,
  content: ParsedPrompt | string,
  conversationId: string,
  tempConversationName: string | undefined,
  status?: MessageStatus,
) => {
  let message = typeof message_or_id !== 'string' ? message_or_id : undefined;
  const { conversations, messages, updateMessagesAndConversation } = useThreadStore.getState();

  const conversationMessages = messages[conversationId];
  if (!message) {
    const id = message_or_id as string;
    message = conversationMessages.find((m) => m.id === id) as Message;
    if (!message) {
      logger.error('message not found');
    }
  }

  const conversation = getConversation(conversationId, conversations);
  if (conversation && message?.content) {
    const text = typeof content === 'string' ? content : content.text;
    const raw = typeof content === 'string' ? content : content.raw;
    const newMessage = changeMessageContent(message, text, raw);
    if (status) {
      newMessage.status = status;
    }
    const newMessages = conversationMessages.map((m) => {
      if (m.id === message.id) {
        return newMessage;
      }
      return m;
    });
    const { updatedMessages } = await updateMessagesAndConversation(
      newMessages,
      conversationMessages,
      { name: tempConversationName },
      conversationId,
      conversations,
    );
    return updatedMessages;
  }
  return undefined;
};

export const sendMessage = async (
  message: Message,
  conversationMessages: Message[],
  conversation: Conversation,
  updatedConversations: Conversation[],
  prompt: ParsedPrompt,
  modelName: string,
  assistant: Assistant | undefined,
  commandManager: CommandManager,
  modelStorage: ModelsConfiguration,
  storedActiveService: AIService | undefined,
  _onSuccess: (usage: LlmUsage | undefined) => void,
  onError: (id: string, error: string) => void,
) => {
  const returnedMessage = { ...message };
  const { providers, setProviders } = useProviderStore.getState();
  const { presets } = usePresetStore.getState();
  const activeService = getActiveService(
    conversation,
    assistant,
    providers,
    storedActiveService,
    modelStorage,
    modelName,
  );
  logger.info('sendMessage', message, activeService, conversation, presets);

  try {
    /* const response = */ await completion(
      activeService,
      message,
      conversationMessages,
      conversation,
      presets,
      prompt,
      commandManager,
    );

    /* if (response.status === 'error') {
      throw new Error(response.message);
    }
    if (response.status === 'success') {
      // setUsage(response.usage);
      onSuccess(response.usage);
      returnedMessage.content = response.content.trim();
    } */
  } catch (e: unknown) {
    logger.error('sendMessage', e, typeof e, activeService.provider?.errors);
    const error = String(e).replaceAll('"', '');
    onError(conversation.id, error);
    returnedMessage.content = error;
    returnedMessage.status = MessageStatus.Error;
    const { provider } = activeService;
    if (provider) {
      const errors = provider.errors || [];
      const len = errors.unshift(error);
      if (len > 50) {
        errors.pop();
      }
      provider.errors = errors;
      const updatedProviders = providers.map((p) => (p.id === provider?.id ? provider : p));
      setProviders(updatedProviders);
    }

    toast.error(error);
  }
  if (returnedMessage.status !== MessageStatus.Error) {
    returnedMessage.status = MessageStatus.Delivered;
    return; // returnedMessage;
  }

  await useThreadStore
    .getState()
    .updateMessagesAndConversation(
      [returnedMessage],
      conversationMessages,
      { name: conversation.name },
      conversation.id,
      updatedConversations,
    );
  // return returnedMessage;
};

export const cancelSending = async (
  messageId: string,
  conversation: Conversation,
  modelName: string,
  assistant: Assistant | undefined,
  modelStorage: ModelsConfiguration,
  storedActiveService: AIService | undefined,
) => {
  const { providers } = useProviderStore.getState();
  const { presets } = usePresetStore.getState();
  const activeService = getActiveService(
    conversation,
    assistant,
    providers,
    storedActiveService,
    modelStorage,
    modelName,
  );
  logger.info('cancelSending', activeService, conversation, presets);
  await cancelCompletion(activeService, conversation.id, messageId);
};
