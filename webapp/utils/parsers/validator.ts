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

import logger from '../logger';
import { ParsedPrompt, PromptToken, PromptTokenState, PromptTokenType } from '.';
import { CommandManager } from '../commands/types';

const validator = (
  commandManager: CommandManager,
  token: PromptToken,
  parsedPrompt: ParsedPrompt,
  _previousToken: PromptToken | undefined,
): [PromptToken, PromptToken | undefined] => {
  let state: PromptTokenState = PromptTokenState.Ok;
  let previousToken: PromptToken | undefined;
  logger.info(
    'tokenValidator',
    token,
    parsedPrompt,
    token.value.length + token.index,
    parsedPrompt.caretPosition,
  );
  let { type } = token;
  const isAtCaret = token.value.length + token.index === parsedPrompt.caretPosition;
  const isEditing = type !== PromptTokenType.Text && isAtCaret;
  let blockOtherCommands: boolean | undefined;
  const command = commandManager.getCommand(token.value, type);
  if (type === PromptTokenType.Mention) {
    if (isEditing) {
      state = PromptTokenState.Editing;
    } else if (!command) {
      // this model is not available
      state = PromptTokenState.Error;
    } else if (parsedPrompt.tokens.find((to) => to.value === token.value && to.type === type)) {
      // this mention is already present
      state = PromptTokenState.Duplicate;
    } else if (parsedPrompt.tokens.find((to) => to.type === PromptTokenType.Mention)) {
      // only one mention at a time
      state = PromptTokenState.Disabled;
    }
  } else if (type === PromptTokenType.Hashtag) {
    if (isEditing) {
      state = PromptTokenState.Editing;
    } else if (!command) {
      // this hashtag is not available
      state = PromptTokenState.Error;
    } else if (parsedPrompt.tokens.find((to) => to.value === token.value && to.type === type)) {
      // this hashtag is already present
      state = PromptTokenState.Duplicate;
    } else if (command.group !== 'parameters-boolean') {
      // should wait for next token as value
      state = PromptTokenState.Disabled;
    }
  } else if (type === PromptTokenType.Action) {
    if (
      parsedPrompt.text.trim().length > 0 ||
      (previousToken && previousToken.type !== PromptTokenType.Text)
    ) {
      type = PromptTokenType.Text;
    } else {
      if (isEditing) {
        state = PromptTokenState.Editing;
      } else if (!command) {
        // this command is not available
        state = PromptTokenState.Error;
      }
      blockOtherCommands = command?.validate?.();
    }
  } else if (type === PromptTokenType.Text && _previousToken?.type === PromptTokenType.Hashtag) {
    const previousCommand = commandManager.getCommand(_previousToken.value, _previousToken.type);
    if (previousCommand && previousCommand.group !== 'parameters-boolean') {
      type = PromptTokenType.ParameterValue;
      previousToken = { ..._previousToken, state: PromptTokenState.Ok };
      if (isAtCaret) {
        state = PromptTokenState.Editing;
      }
    }
  } else if (token.value.trim() === '@' && isEditing) {
    state = PromptTokenState.Editing;
    type = PromptTokenType.Mention;
  } else if (token.value === '#' && isEditing) {
    state = PromptTokenState.Editing;
    type = PromptTokenType.Hashtag;
  }
  return [{ ...token, type, state, blockOtherCommands }, previousToken];
};

export default validator;
