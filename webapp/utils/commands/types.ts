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

import { Avatar, PresetParameter, Ui } from '@/types';
import { ParsedPrompt } from '../parsers';

export enum CommandType {
  Action = 'action',
  Parameter = 'hashtag',
  Mention = 'mention',
}

export type Command = Ui.MenuItem & {
  type: CommandType;
  tag?: string;
  execute?: (value: string) => void;
  postValidate?: (value?: string) => boolean;
  validate?: (value?: string) => boolean;
  avatar?: Avatar;
};

export type CommandManager = {
  commands: Command[];
  getCommand: (value: string, type: CommandType, tag?: string) => Command | undefined;
  filterCommands: (commandValue: string) => Command[];
  findCommandParameters: (prompt: ParsedPrompt) => Record<string, PresetParameter>;
};
