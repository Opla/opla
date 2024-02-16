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
import { Author, ContextWindowPolicy, Conversation, Message } from '@/types';
import { createBaseRecord, createBaseNamedRecord, updateRecord } from '.';

export const createMessage = (author: Author, content: string) => {
  const message = {
    ...createBaseRecord(),
    author,
    content,
  };
  return message as Message;
};

/* const updateMessage = (message: Message, messages: Message[]): Message[] => {
  const updatedMessages = [...messages];
  const i = messages.findIndex((m) => m.id === message.id);
  const updatedMessage = updateRecord(message) as Message;
  if (i === -1) {
    updatedMessages.push(updatedMessage);
  } else {
    updatedMessages[i] = updatedMessage;
  }
  return updatedMessages;
}; */

export const mergeMessages = (messages: Message[], newMessages: Message[]) => {
  const newMessagesIds = newMessages.map((m) => m.id);
  const freshNewMessages = newMessages.filter((m) => !messages.find((msg) => msg.id === m.id));
  const mergedMessages = messages.map((m) => {
    if (newMessagesIds.includes(m.id)) {
      const updatedMessage = newMessages.find((newMsg) => newMsg.id === m.id);
      return { ...m, ...updatedMessage, updatedAt: Date.now() };
    }
    return m;
  });
  return [...mergedMessages, ...freshNewMessages];
};

export const createConversation = (name: string) => {
  const conversation: Conversation = {
    ...createBaseNamedRecord(name),
    messages: [],
    contextWindowPolicy: ContextWindowPolicy.Rolling,
    keepSystem: true,
  };
  return conversation;
};

export const getConversation = (
  conversationId: string | undefined,
  conversations: Conversation[],
) => conversations.find((c) => c.id === conversationId);

export const updateConversation = (
  conversation: Conversation,
  conversations: Conversation[],
  noUpdate = false,
) => {
  const i = conversations.findIndex((c) => c.id === conversation.id);
  if (i === -1) {
    return conversations;
  }
  if (noUpdate) {
    return conversations.map((c) => (c.id === conversation.id ? conversation : c));
  }
  const updatedConversation = updateRecord(conversation) as Conversation;
  return conversations.map((c) => (c.id === updatedConversation.id ? updatedConversation : c));
};

export const removeConversation = (conversationId: string, conversations: Conversation[]) =>
  conversations.filter((c) => c.id !== conversationId);

export const updateOrCreateConversation = (
  conversationId: string | undefined,
  conversations: Conversation[],
  title = 'Conversation',
) => {
  let conversation = conversations.find((c) => c.id === conversationId);
  let updatedConversations;
  if (conversation) {
    updatedConversations = updateConversation(conversation, conversations);
  } else {
    conversation = createConversation(title.trim().substring(0, 200));
    updatedConversations = [...conversations, conversation];
  }
  return updatedConversations;
};

export const mergeConversations = (
  conversations: Conversation[],
  newConversations: Conversation[],
) => {
  const mergedConversations = [...conversations, ...newConversations];

  const conversationMap = new Map<string, Conversation>();
  mergedConversations.forEach((c) => {
    const existingConversation = conversationMap.get(c.id);
    if (!existingConversation || c.updatedAt >= existingConversation.updatedAt) {
      conversationMap.set(c.id, c);
    }
  });
  return Array.from(conversationMap.values());
};

export const isKeepSystem = (conversation: Conversation | undefined) =>
  typeof conversation?.keepSystem === 'boolean' ? conversation?.keepSystem : true;
