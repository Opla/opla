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
import { Command, CommandType } from './Command';

const actionsItems: Command[] = [
  { value: '/system', label: 'System', group: 'actions', type: CommandType.Action },
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

export const getCommands = (mentionItems: Partial<Command>[]): Command[] => {
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
  return commands;
};

export const getCommandType = (value: string): CommandType | undefined => {
  if (value.startsWith('/')) {
    return CommandType.Action;
  }
  if (value.startsWith('#')) {
    return CommandType.Parameter;
  }
  if (value.startsWith('@')) {
    return CommandType.Mention;
  }
  return undefined;
};
