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

// Made using https://transform.tools/typescript-to-zod

import { SafeParseReturnType, z } from 'zod';
import { Conversation, Metadata } from '@/types';
import { ParsedPrompt } from '../parsers';

export const MetadataSchema: z.ZodSchema<Metadata> = z.lazy(() =>
  z.record(z.union([z.string(), z.number(), z.boolean(), MetadataSchema])),
);

export const AuthorSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  name: z.string(),
  avatarUrl: z.string().optional(),
  metadata: MetadataSchema.optional(),
});

export const ContentSchema = z.object({
  type: z.enum(['text', 'image', 'video', 'audio', 'file', 'link', 'location', 'contact']),
  parts: z.array(z.string()),
  metadata: MetadataSchema.optional(),
});

export const BaseRecordSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  metadata: MetadataSchema.optional(),
});

export const BaseNamedRecordSchema = BaseRecordSchema.and(
  z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
);

export const MessageSchema = BaseRecordSchema.and(
  z.object({
    author: AuthorSchema,
    content: z.union([z.string(), ContentSchema]),
  }),
);

export const ConversationSchema = BaseNamedRecordSchema.and(
  z.object({
    messages: z.array(MessageSchema),
    pluginIds: z.array(z.string()).optional(),
    currentPrompt: z.string().optional(),
    note: z.string().optional(),
    system: z.string().optional(),
    model: z.string().optional(),
    provider: z.string().optional(),
    importedFrom: z.string().optional(),
    temp: z.boolean().optional(),
  }),
);

const ConversationsSchema = z.array(ConversationSchema);

export type Conversations = z.infer<typeof ConversationsSchema>;

export const validateConversations = (data: unknown): SafeParseReturnType<unknown, Conversations> =>
  ConversationsSchema.safeParse(data);

export const getConversationTitle = (conversation: Conversation) => {
  if (conversation.temp) {
    return conversation.currentPrompt && typeof conversation.currentPrompt !== 'string'
      ? (conversation.currentPrompt as ParsedPrompt).text || ''
      : conversation.currentPrompt || '';
  }
  return conversation.name;
};
