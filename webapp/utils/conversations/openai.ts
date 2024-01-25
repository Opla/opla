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

import { Conversation, Message } from '@/types';
import { SafeParseReturnType, z } from 'zod';

const IdSchema = z.string();

const UserSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  name: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});

const ContentSchema = z.object({
  content_type: z.enum(['text', 'image', 'video', 'audio', 'file', 'link', 'location', 'contact']),
  parts: z.array(z.any().or(z.string())),
});

const MessageSchema = z.object({
  id: IdSchema,
  author: UserSchema,
  create_time: z.number().nullable().optional(),
  update_time: z.number().nullable().optional(),
  content: ContentSchema,
  status: z.enum(['finished_successfully']).or(z.string()),
  end_turn: z.boolean().nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  recipient: z.string().nullable().optional(),
});

const ConversationSchema = z.object({
  title: IdSchema,
  create_time: z.number(),
  update_time: z.number(),
  mapping: z.record(
    z.string(),
    z.object({
      id: IdSchema,
      message: MessageSchema.nullable().optional(),
      parent: IdSchema.nullable().optional(),
      children: z.array(IdSchema).nullable().optional(),
    }),
  ),
  moderation_results: z.array(z.any()).nullable().optional(),
  current_node: IdSchema,
  plugin_ids: z.array(IdSchema).nullable().optional(),
  conversation_id: IdSchema,
  conversation_template_id: IdSchema.nullable().optional(),
  gizmo_id: IdSchema.nullable().optional(),
  id: IdSchema,
});

const ConversationsSchema = z.array(ConversationSchema);

export type ChatGPTConversations = z.infer<typeof ConversationsSchema>;

const validateChaGPTConversations = (
  data: unknown,
): SafeParseReturnType<unknown, ChatGPTConversations> => ConversationsSchema.safeParse(data);

const importChatGPTConversation = (fromChatGPT: ChatGPTConversations): Conversation[] => {
  const conversations = fromChatGPT.map((conversation) => {
    const createdAt = conversation.create_time;
    const updatedAt = conversation.update_time;
    let c = createdAt;
    let u = updatedAt;
    const messages = Object.values(conversation.mapping)
      .map((mapping) => {
        const { message } = mapping;
        if (message) {
          const createdAtm = message.create_time || c;
          const updatedAtm = message.update_time || message.create_time || u;
          c = createdAtm;
          u = updatedAtm;
          const name = message.author.role === 'user' ? 'you' : 'chatgpt';
          return {
            id: message.id,
            createdAt: Math.trunc(createdAtm * 1000),
            updatedAt: Math.trunc(updatedAtm * 1000),
            content: {
              type: message.content.content_type,
              parts: message.content.parts,
            },
            author: {
              name,
              role: message.author.role,
            },
          } as Message;
        }
        return null as unknown as Message;
      })
      .filter((m) => m !== null);

    return {
      id: conversation.id,
      createdAt: Math.trunc(createdAt * 1000),
      updatedAt: Math.trunc(updatedAt * 1000),
      name: conversation.title,
      messages,
      importedFrom: 'chatgpt',
      note: `Imported from ChatGPT ${Date().toString()}`,
    };
  });
  return conversations;
};
export { validateChaGPTConversations, importChatGPTConversation };
