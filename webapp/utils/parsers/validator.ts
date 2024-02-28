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
import {
  ParsedPrompt,
  PromptToken,
  PromptTokenState,
  PromptTokenType,
  compareActions,
  compareHashtags,
  compareMentions,
} from '.';
import { PromptCommand } from './promptCommand';

const validator = (
  commands: PromptCommand[],
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
  if (type === PromptTokenType.Mention) {
    if (isEditing) {
      state = PromptTokenState.Editing;
    } else if (!commands.find((m) => compareMentions(m.value, token.value))) {
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
    const command = commands.find((m) => compareHashtags(m.value, token.value));
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
    const command = commands.find((m) => compareActions(m.value, token.value));
    if (isEditing) {
      state = PromptTokenState.Editing;
    } else if (!command) {
      // this command is not available
      state = PromptTokenState.Error;
    }
  } else if (type === PromptTokenType.Text && _previousToken?.type === PromptTokenType.Hashtag) {
    const previousCommand = commands.find((m) => compareHashtags(m.value, _previousToken.value));
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
  return [{ ...token, type, state }, previousToken];
};

export default validator;
