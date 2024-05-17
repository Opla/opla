// Copyright 2024 mik
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
  Asset,
  Author,
  Content,
  ContentFull,
  ContentType,
  Message,
  MessageStatus,
  Metadata,
} from '@/types';
import { createBaseRecord } from '.';

export const createStringArray = (content: string | string[]): string[] =>
  Array.isArray(content) ? content : [content];

const createContentFull = (
  content: string | string[],
  rawContent?: string | string[],
  metadata?: Metadata,
  type = ContentType.Text,
): ContentFull => {
  const parts = createStringArray(content);
  const raw = rawContent ? createStringArray(rawContent) : undefined;
  const textContent: ContentFull = { type, raw, parts, metadata };
  return textContent;
};

export const createTextContent = (
  content: string | string[] | undefined,
  rawContent?: string | string[],
  metadata?: Metadata,
): string | Content | undefined => {
  if (!content || (typeof content === 'string' && !rawContent)) {
    return content;
  }
  return createContentFull(content, rawContent, metadata);
};

export const createContent = (
  content: string | string[] | Content,
  rawContent?: string | string[],
  metadata?: Metadata,
): ContentFull => {
  if (typeof content === 'string' || Array.isArray(content)) {
    return createContentFull(content, rawContent, metadata);
  }
  return content as ContentFull;
};

export const createMessage = (
  author: Author,
  content: string | string[] | undefined,
  rawContent = content,
  assets?: Asset[],
): Message => {
  const message: Message = {
    ...createBaseRecord<Message>(),
    author,
    content: createTextContent(content, rawContent),
    assets: assets?.map((a) => a.id),
  };
  return message;
};

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

export const getRawContentAsString = (messageContent: string | Content | undefined): string => {
  let content: string;
  if (messageContent && typeof messageContent !== 'string') {
    content = messageContent.raw?.join('\n') || messageContent.parts.join('\n');
  } else {
    content = messageContent || '';
  }
  return content;
};

export const getContentAsString = (messageContent: string | Content | undefined): string => {
  let content: string;
  if (messageContent && typeof messageContent !== 'string') {
    content = messageContent.parts.join('\n');
  } else {
    content = messageContent || '';
  }
  return content;
};

export const getMessageContentAsString = (message: Message | undefined): string =>
  getContentAsString(message?.content);

export const getMessageRawContentAsString = (message: Message | undefined): string =>
  getContentAsString(message?.content);

export const getMessageContentHistoryAsString = (
  message: Message,
  index = 0,
  raw = false,
): string => {
  const contentHistory = message.contentHistory || [];
  const content = index ? contentHistory[index - 1] : message.content;
  return raw ? getRawContentAsString(content) : getContentAsString(content);
};

export const getMessageContentAuthorAsString = (message: Message, index = 0): Author => {
  const contentHistory = message.contentHistory || [];
  let { author } = message;
  if (index !== 0 && typeof contentHistory[index - 1] !== 'string') {
    author = (contentHistory[index - 1] as ContentFull)?.author || author;
  }
  return author;
};

export const getMessageFirstAsset = (message: Message, assets: Asset[] | undefined) => {
  const assetId = message.assets?.[0];
  return assets?.find((a) => a.id === assetId);
};

export const changeMessageContent = (
  previousMessage: Message,
  content: string,
  rawContent = content,
  status = previousMessage.status,
): Message => {
  const message: Message = {
    ...previousMessage,
    status,
    content: createTextContent(content, rawContent),
  };
  const previousContentText = getMessageContentAsString(previousMessage);
  if (
    previousContentText &&
    previousContentText !== '...' &&
    previousContentText !== content &&
    previousMessage.status !== MessageStatus.Error
  ) {
    const { contentHistory = [] } = previousMessage;
    const previousContent = createContent(previousContentText);
    previousContent.author = { ...previousMessage.author };
    contentHistory.unshift(previousContent);
    message.contentHistory = contentHistory;
  }
  return message;
};
