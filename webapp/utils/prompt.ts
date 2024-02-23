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
}

export enum PromptTokenState {
  Ok = 'ok',
  Error = 'error',
  Editing = 'editing',
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

export function parsePrompt(options: ParsePromptOptions, validator: TokenValidator): ParsedPrompt {
  const { text: value, caretStartIndex: caretPosition = 0 } =
    'textarea' in options ? getCurrentWord(options.textarea) : options;

  const tokens: PromptToken[] = [];
  const spans = value.split(/(?<=^| )([@|#][\p{L}0-9._-]+)|(\n)/gu);
  // console.log('parsePrompt spans', spans);
  let index = 0;
  const parsedPrompt = { tokens, caretPosition, raw: value, text: '', currentTokenIndex: 0 };
  spans.forEach((span) => {
    let token: PromptToken | undefined;
    if (!span) {
      return;
    }
    if (span.startsWith('@') || span.startsWith('#')) {
      token = validator(
        {
          type: span[0] === '@' ? PromptTokenType.Mention : PromptTokenType.Hashtag,
          value: span,
          index,
        },
        parsedPrompt,
      );
    } else if (span !== '') {
      const trimmed = span.trim();
      if (span.indexOf('\n') !== -1) {
        token = { type: PromptTokenType.Newline, value: span, index };
        parsedPrompt.text += `\n`;
      } else {
        token = { type: PromptTokenType.Text, value: span, index };
        if (trimmed !== '') {
          parsedPrompt.text += ` ${trimmed}`;
        }
      }
    }
    if (token) {
      tokens.push(token);
      index += span.length;
    }
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

export function comparePrompts(
  prompt1: ParsedPrompt | string | undefined,
  prompt2: ParsedPrompt | string | undefined,
) {
  const raw1 = !prompt1 || typeof prompt1 === 'string' ? prompt1 : prompt1.raw;
  const raw2 = !prompt2 || typeof prompt2 === 'string' ? prompt2 : prompt2.raw;
  return raw1 === raw2;
}
