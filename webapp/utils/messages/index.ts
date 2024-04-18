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

import { Assistant, Conversation, LlmUsage, Message, MessageStatus, Store } from '@/types';
import { toast } from '@/components/ui/Toast';
import { Context } from '@/context';
import { CommandManager } from '../commands/types';
import logger from '../logger';
import { ParsedPrompt } from '../parsers';
import { getActiveService } from '../services';
import { completion } from '../providers';
import { getConversation } from '../data/conversations';
import { changeMessageContent } from '../data/messages';

export const updateMessageContent = async (
  message: Message,
  content: ParsedPrompt,
  conversationId: string,
  tempConversationName: string | undefined,
  context: Context,
) => {
  const { conversations, getConversationMessages, updateMessagesAndConversation } = context;
  const conversation = getConversation(conversationId, conversations);
  if (conversation && message.content) {
    const newMessage = changeMessageContent(message, content.text, content.raw);
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
  context: Context,
  config: Store,
  onSuccess: (usage: LlmUsage | undefined) => void,
  onError: (id: string, error: string) => void,
) => {
  const returnedMessage = { ...message };
  const activeService = getActiveService(
    conversation,
    assistant,
    context.providers,
    config,
    modelName,
  );
  logger.info('sendMessage', activeService, conversation, context.presets);

  try {
    const response = await completion(
      activeService,
      message,
      conversationMessages,
      conversation,
      context.presets,
      prompt,
      commandManager,
    );

    if (response.status === 'error') {
      throw new Error(response.message);
    }
    if (response.status === 'success') {
      // setUsage(response.usage);
      onSuccess(response.usage);
      returnedMessage.content = response.content.trim();
    }
  } catch (e: any) {
    logger.error('sendMessage', e, typeof e);
    const error = String(e);
    /* onError(conversation.id, error);
      setErrorMessage({ ...errorMessage, [conversation.id]: error }); */
    onError(conversation.id, error);
    returnedMessage.content = error;
    returnedMessage.status = MessageStatus.Error;
    const { provider } = activeService;
    if (provider) {
      const { errors = [] } = provider || { errors: [] };
      const len = errors.unshift(error);
      if (len > 50) {
        errors.pop();
      }
      provider.errors = errors;
      const updatedProviders = context.providers.map((p) => (p.id === provider?.id ? provider : p));
      context.setProviders(updatedProviders);
    }

    toast.error(String(e));
  }
  if (returnedMessage.status !== MessageStatus.Error) {
    returnedMessage.status = MessageStatus.Delivered;
  }

  await context.updateMessagesAndConversation(
    [returnedMessage],
    conversationMessages,
    { name: conversation.name },
    conversation.id,
    updatedConversations,
  );
  return returnedMessage;
};
