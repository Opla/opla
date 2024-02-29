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

import { getMentionName } from '../parsers';
import { Command, CommandManager, CommandType } from './types';

const actionsItems: Command[] = [
  {
    value: '/system',
    label: 'System',
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
  command2: string | string,
  type?: CommandType,
): boolean => {
  const type1 = getCommandType(command1);
  const type2 = getCommandType(command2);
  return (!type || (type === type1 && type === type2)) && command1 === command2;
};

export const getCommandManager = (mentionItems: Partial<Command>[]): CommandManager => {
  const commands = [
    ...mentionItems
      .filter((item) => !item.selected)
      .map(
        (item) =>
          ({
            ...item,
            value: getMentionName(item.value as string),
            group: 'models',
            type: CommandType.Mention,
          }) as Command,
      ),
    ...getHashtagCommands(),
    ...getActionCommands(),
  ];
  return {
    commands,
    getCommand: (value: string, type: string) => {
      const command = commands.find((m) => compareCommands(m.value, value, type as CommandType));
      return command;
    },
    filterCommands: (commandValue: string): Command[] =>
      commands.filter(
        (c) => !(!c.value || c.value?.toLowerCase().indexOf(commandValue.toLowerCase()) === -1),
      ),
  };
};
