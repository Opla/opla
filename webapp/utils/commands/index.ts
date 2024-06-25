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

import { Assistant, Conversation, Message, PresetParameter, Provider, ProviderType } from '@/types';
import {
  ParsedPrompt,
  PromptToken,
  PromptTokenState,
  PromptTokenType,
  compareMentions,
  getMentionName,
} from '../parsers';
import { Command, CommandManager, CommandType } from './types';
import { createMessage } from '../data/messages';

const actionsItems: Command[] = [
  {
    value: '/system',
    label: 'System',
    group: 'actions',
    type: CommandType.Action,
    validate: () => true,
  },
  {
    value: '/imagine',
    label: 'Imagine',
    group: 'actions',
    type: CommandType.Action,
    validate: () => true,
  },
];

const parameterItems: Command[] = [
  {
    value: '#provider_key',
    label: 'Provider key',
    group: 'parameters-string',
    type: CommandType.Parameter,
  },
  { value: '#stream', label: 'Stream', group: 'parameters-boolean', type: CommandType.Parameter },
];

export const getActionCommands = (): Command[] => {
  const actions = actionsItems.map((item) => item);
  return actions;
};

export const getHashtagCommands = (): Command[] => {
  const parameters = parameterItems.map((item) => item);
  return parameters;
};

export const getCommandType = (value: string | undefined): CommandType | undefined => {
  if (value?.startsWith('/')) {
    return CommandType.Action;
  }
  if (value?.startsWith('#')) {
    return CommandType.Parameter;
  }
  if (value?.startsWith('@')) {
    return CommandType.Mention;
  }
  return undefined;
};

export const compareCommands = (
  command1: string | undefined,
  command2: string,
  type?: CommandType,
  tag1?: string | undefined,
  tag2?: string | undefined,
): boolean => {
  const type1 = getCommandType(command1);
  const type2 = getCommandType(command2);
  return (
    (!type || (type === type1 && type === type2)) &&
    command1 === command2 &&
    (tag1 === undefined || tag1 === tag2)
  );
};

export const getCommandManager = (
  cmds: Partial<Command>[],
  assistants: Assistant[],
): CommandManager => {
  const commands = [
    ...cmds
      .filter((item) => !item.selected)
      .map(
        (item) =>
          ({
            ...item,
            value: getMentionName(item.value as string),
            tag: 'models',
            type: CommandType.Mention,
          }) as Command,
      ),
    ...assistants
      .filter((a) => !a.hidden)
      .map(
        (a) =>
          ({
            key: a.id,
            label: a.name,
            avatar: a.avatar,
            value: getMentionName(a.name),
            tag: 'assistants',
            type: CommandType.Mention,
          }) as Command,
      ),
    ...getHashtagCommands(),
    ...getActionCommands(),
  ];
  return {
    commands,
    getCommand: (value: string, type: string, tag?: string) => {
      const command = commands.find((m) =>
        compareCommands(m.value, value, type as CommandType, tag, m.tag),
      );
      return command;
    },
    filterCommands: (commandValue: string): Command[] =>
      commands.filter(
        (c) => !(!c.value || c.value?.toLowerCase().indexOf(commandValue.toLowerCase()) === -1),
      ),
    findCommandParameters: (prompt: ParsedPrompt): Record<string, PresetParameter> => {
      const presetParameters: Record<string, PresetParameter> = {};
      let param: PromptToken | undefined;
      prompt.tokens.forEach((token) => {
        if (token.type === PromptTokenType.Hashtag) {
          if (token.value === '#stream') {
            presetParameters[token.value] = true;
          } else {
            param = token;
          }
        } else if (param && token.type === PromptTokenType.ParameterValue) {
          presetParameters[param.value] = token.value;
          param = undefined;
        }
      });
      return presetParameters;
    },
  };
};

export const preProcessingCommands = async (
  cId: string,
  prompt: ParsedPrompt,
  commandManager: CommandManager,
  conversation: Conversation,
  conversations: Conversation[],
  tempConversationName: string,
  selectedModelNameOrId: string,
  previousMessage: Message | undefined,
  context: {
    changeService: Function;
    getConversationMessages: Function;
    t: Function;
    updateMessagesAndConversation: Function;
    providers: Provider[];
  },
): Promise<
  { type: 'error' | 'ok' | 'return' | 'imagine' } & (
    | { type: 'return'; updatedConversation: Conversation; updatedConversations: Conversation[] }
    | { type: 'ok'; modelName: string | undefined; assistantId: string | undefined }
    | { type: 'error'; error: string }
    | { type: 'imagine' }
  )
> => {
  const mentions = prompt.tokens.filter((to) => to.type === PromptTokenType.Mention);
  const mentionCommand =
    mentions.length === 1
      ? commandManager.commands.find((cmd) => compareMentions(cmd.value, mentions[0].value))
      : undefined;
  let modelName: string | undefined;
  let assistantId: string | undefined;
  if (mentionCommand && mentionCommand.tag === 'models') {
    modelName = mentionCommand.label;
  } else if (mentionCommand && mentionCommand.tag === 'assistants') {
    assistantId = mentionCommand.key;
  }

  const action = prompt.tokens.find((to) => to.type === PromptTokenType.Action);

  let updatedConversation = conversation;
  let updatedConversations = conversations;
  if (action) {
    const command = commandManager.getCommand(action.value, action.type as unknown as CommandType);
    if (command) {
      command.execute?.(action.value);
      if (command.label === 'System') {
        const message = createMessage({ role: 'system', name: 'system' }, prompt.text, prompt.raw);
        ({ updatedConversation, updatedConversations } =
          await context.updateMessagesAndConversation(
            [message],
            context.getConversationMessages(cId),
            tempConversationName,
            cId,
          ));
      } else if (command.label === 'Imagine') {
        return { type: 'imagine' };
      }
    }
    return { type: 'return', updatedConversation, updatedConversations };
  }

  if (prompt.text.length < 1) {
    if (modelName) {
      // Change conversation's model if there is only a model mention in the prompt
      context.changeService(modelName, mentionCommand?.group as ProviderType, {
        currentPrompt: undefined,
      });
      return { type: 'return', updatedConversation, updatedConversations };
    }
    return { type: 'error', error: context.t('Please enter a message.') };
  }

  if (mentions.length > 1) {
    return { type: 'error', error: context.t('Only one model at a time.') };
  }
  if (
    mentions.length === 1 &&
    assistantId === undefined &&
    (!modelName || mentions[0].state === PromptTokenState.Error)
  ) {
    return { type: 'error', error: context.t('This model is not available.') };
  }
  if (mentions.length === 1 && assistantId && mentions[0].state === PromptTokenState.Error) {
    return { type: 'error', error: context.t('This model is not available.') };
  }
  return { type: 'ok', modelName, assistantId };
};

export const getMentionCommands = (
  prompt: ParsedPrompt | undefined,
  commandManager: CommandManager,
  tag?: string,
): Command[] => {
  const mentions = prompt?.tokens.filter((to) => to.type === PromptTokenType.Mention) ?? [];
  const modelCommands = mentions
    .map((m) => commandManager.getCommand(m.value, CommandType.Mention, tag))
    .filter((m) => m !== undefined);

  return modelCommands;
};
