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

import { getCurrentWord } from './caretposition';

export enum PromptTokenType {
  Text = 'text',
  Newline = 'newline',
  Mention = 'mention',
  Hashtag = 'hashtag',
  Action = 'action',
}

export enum PromptTokenState {
  Ok = 'ok',
  Error = 'error',
  Editing = 'editing',
  Disabled = 'disabled',
  Duplicate = 'duplicate',
}

export type PromptToken = {
  type: PromptTokenType;
  value: string;
  index: number;
  state?: PromptTokenState;
};

export type ParsedPrompt = {
  raw: string;
  text: string;
  caretPosition: number;
  currentTokenIndex: number;
  tokens: PromptToken[];
};

type ParsePromptOptions =
  | {
      text: string;
      caretStartIndex?: number;
    }
  | {
      textarea: HTMLTextAreaElement;
    };

export type TokenValidator = (token: PromptToken, currentParsedPrompt: ParsedPrompt) => PromptToken;

export const isHashTag = (word: string) => word.startsWith('#');
export const isMention = (word: string) => word.startsWith('@');
export const isAction = (word: string, start: number) => start === 0 && word.startsWith('/');
export const isCommand = (word: string, start: number) =>
  isAction(word, start) || isMention(word) || isHashTag(word);

export const getTokenType = (word: string, start: number) => {
  let type = PromptTokenType.Text;
  switch (word[0]) {
    case '#':
      type = PromptTokenType.Hashtag;
      break;
    case '@':
      type = PromptTokenType.Mention;
      break;
    case '/':
      if (start === 0) {
        type = PromptTokenType.Action;
      }
      break;
    default:
      type = PromptTokenType.Text;
  }
  return type;
};
export function parsePrompt(options: ParsePromptOptions, validator: TokenValidator): ParsedPrompt {
  const { text: value, caretStartIndex: caretPosition = 0 } =
    'textarea' in options ? getCurrentWord(options.textarea) : options;

  const tokens: PromptToken[] = [];
  const spans = value.split(/(?<=^| )([@|#|/][\p{L}0-9._-]+)|(\n)/gu);
  let index = 0;
  const parsedPrompt = { tokens, caretPosition, raw: value, text: '', currentTokenIndex: 0 };
  spans.forEach((span) => {
    if (!span || span === '') {
      return;
    }

    const type = getTokenType(span, parsedPrompt.text.trim().length);
    let token: PromptToken = { type, value: span, index };
    if (type !== PromptTokenType.Text) {
      token = validator(token, parsedPrompt);
    } else {
      const trimmed = span.trim();
      if (span.indexOf('\n') !== -1) {
        token.type = PromptTokenType.Newline;
        parsedPrompt.text += `\n`;
      } else if (trimmed !== '') {
        parsedPrompt.text += ` ${trimmed}`;
      }
    }
    tokens.push(token);
    index += span.length;
  });
  return parsedPrompt;
}

export function toPrompt(
  textOrPrompt: string | ParsedPrompt,
  tokenValidator: TokenValidator,
): ParsedPrompt {
  return typeof textOrPrompt === 'string'
    ? parsePrompt({ text: textOrPrompt }, tokenValidator)
    : textOrPrompt;
}

export const getMentionName = (name: string): string =>
  !name || isMention(name) ? name : `@${name.replace(/[^\p{L}0-9._-]+/gu, '_')}`;

export const compareMentions = (mention1: string | undefined, mention2: string | undefined) =>
  getMentionName(mention1 || '1') === getMentionName(mention2 || '2');

export function comparePrompts(
  prompt1: ParsedPrompt | string | undefined,
  prompt2: ParsedPrompt | string | undefined,
) {
  const raw1 = !prompt1 || typeof prompt1 === 'string' ? prompt1 : prompt1.raw;
  const raw2 = !prompt2 || typeof prompt2 === 'string' ? prompt2 : prompt2.raw;
  return raw1 === raw2;
}
