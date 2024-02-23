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

// https://github.com/component/textarea-caret-position

// We'll copy the properties below into the mirror div.
// Note that some browsers, such as Firefox, do not concatenate properties
// into their shorthand (e.g. padding-top, padding-bottom etc. -> padding),
// so we have to list every single property explicitly.
const properties = [
  'direction', // RTL support
  'boxSizing',
  'width', // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
  'height',
  'overflowX',
  'overflowY', // copy the scrollbar for IE

  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',

  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',

  // https://developer.mozilla.org/en-US/docs/Web/CSS/font
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',

  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration', // might not make a difference, but better be safe

  'letterSpacing',
  'wordSpacing',

  'tabSize',
  'MozTabSize',
] as const;

const isBrowser = typeof window !== 'undefined';
// @ts-expect-error
const isFirefox = isBrowser && window.mozInnerScreenX != null;

export function getCaretPosition(element: HTMLTextAreaElement) {
  return {
    caretStartIndex: element.selectionStart || 0,
    caretEndIndex: element.selectionEnd || 0,
  };
}

export function getCurrentWord(element: HTMLTextAreaElement) {
  const text = element.value;
  const { caretStartIndex } = getCaretPosition(element);

  // Find the start position of the word
  let start = caretStartIndex;
  while (start > 0 && text[start - 1].match(/\S/)) {
    start -= 1;
  }

  // Find the end position of the word
  let end = caretStartIndex;
  while (end < text.length && text[end].match(/\S/)) {
    end += 1;
  }

  const currentWord = text.substring(start, end);

  return { currentWord, start, caretStartIndex, text };
}

export function replaceWord(element: HTMLTextAreaElement, value: string) {
  const text = element.value;
  const caretPos = element.selectionStart;

  // Find the word that needs to be replaced
  const wordRegex = /[\w@#]+/g;
  let startIndex;
  let endIndex;

  let match = wordRegex.exec(text);
  while (match !== null) {
    startIndex = match.index;
    endIndex = startIndex + match[0].length;

    if (caretPos >= startIndex && caretPos <= endIndex) {
      break;
    }
    match = wordRegex.exec(text);
  }

  // Replace the word with a new word using document.execCommand
  if (startIndex !== undefined && endIndex !== undefined) {
    // Preserve the current selection range
    const { selectionStart } = element;
    const { selectionEnd } = element;

    // Modify the selected range to encompass the word to be replaced
    element.setSelectionRange(startIndex, endIndex);

    // REMINDER: Fastest way to include CMD + Z compatibility
    // Execute the command to replace the selected text with the new word
    document.execCommand('insertText', false, value);

    // Restore the original selection range
    element.setSelectionRange(
      selectionStart - (endIndex - startIndex) + value.length,
      selectionEnd - (endIndex - startIndex) + value.length,
    );
  }
}

export function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number,
  options?: { debug: boolean },
) {
  if (!isBrowser) {
    throw new Error(
      'textarea-caret-position#getCaretCoordinates should only be called in a browser',
    );
  }

  const debug = (options && options.debug) || false;
  if (debug) {
    const el = document.querySelector('#input-textarea-caret-position-mirror-div');
    if (el) el?.parentNode?.removeChild(el);
  }

  // The mirror div will replicate the textarea's style
  const div = document.createElement('div');
  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  const { style } = div;
  const computed = window.getComputedStyle(element);
  const isInput = element.nodeName === 'INPUT';

  // Default textarea styles
  style.whiteSpace = 'pre-wrap';
  if (!isInput) style.wordWrap = 'break-word'; // only for textarea-s

  // Position off-screen
  style.position = 'absolute'; // required to return coordinates properly
  if (!debug) style.visibility = 'hidden'; // not 'display: none' because we want rendering

  // Transfer the element's properties to the div
  properties.forEach((prop) => {
    if (isInput && prop === 'lineHeight') {
      // Special case for <input>s because text is rendered centered and line height may be != height
      if (computed.boxSizing === 'border-box') {
        const height = parseInt(computed.height, 10);
        const outerHeight =
          parseInt(computed.paddingTop, 10) +
          parseInt(computed.paddingBottom, 10) +
          parseInt(computed.borderTopWidth, 10) +
          parseInt(computed.borderBottomWidth, 10);
        const targetHeight = outerHeight + parseInt(computed.lineHeight, 10);
        if (height > targetHeight) {
          style.lineHeight = `${height - outerHeight}px`;
        } else if (height === targetHeight) {
          style.lineHeight = computed.lineHeight;
        } else {
          style.lineHeight = '0px';
        }
      } else {
        style.lineHeight = computed.height;
      }
    } else {
      // @ts-expect-error
      style[prop] = computed[prop];
    }
  });

  if (isFirefox) {
    // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
    if (element.scrollHeight > parseInt(computed.height, 10)) style.overflowY = 'scroll';
  } else {
    style.overflow = 'hidden'; // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'
  }

  div.textContent = element.value.substring(0, position);
  // The second special handling for input type="text" vs textarea:
  // spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
  if (isInput) div.textContent = div.textContent.replace(/\s/g, '\u00a0');

  const span = document.createElement('span');
  // Wrapping must be replicated *exactly*, including when a long word gets
  // onto the next line, with whitespace at the end of the line before (#7).
  // The  *only* reliable way to do that is to copy the *entire* rest of the
  // textarea's content into the <span> created at the caret position.
  // For inputs, just '.' would be enough, but no need to bother.
  // REMINDER: changed it from "." to empty string ""...
  span.textContent = element.value.substring(position) || ''; // || because a completely empty faux span doesn't render at all
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed.borderTopWidth, 10),
    left: span.offsetLeft + parseInt(computed.borderLeftWidth, 10),
    height: parseInt(computed.lineHeight, 10),
  };

  if (debug) {
    span.style.backgroundColor = '#aaa';
  } else {
    document.body.removeChild(div);
  }

  return coordinates;
}

export type PromptToken = {
  type: 'text' | 'mention' | 'hashtag';
  value: string;
  index: number;
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

export function parsePrompt(options: ParsePromptOptions): ParsedPrompt {
  const { text: value, caretStartIndex: caretPosition = 0 } =
    'textarea' in options ? getCurrentWord(options.textarea) : options;

  const tokens: PromptToken[] = [];
  const spans = value.split(/(?<=^| )([@|#][\p{L}0-9._-]+)/gmu);
  let index = 0;
  spans.forEach((span) => {
    if (span.startsWith('@') || span.startsWith('#')) {
      tokens.push({ type: span[0] === '@' ? 'mention' : 'hashtag', value: span, index });
    } else if (span !== '') {
      tokens.push({ type: 'text', value: span, index });
    }
    index += span.length;
  });
  const texts = tokens
    .filter((t) => t.type === 'text' && t.value.trim() !== '')
    .map((t) => t.value.trim());
  // console.log('parsePrompt texts', texts);
  const text = texts.join(' ');
  // console.log('parsePrompt', { tokens, text });

  // console.log('parsePrompt spans', spans);
  return {
    raw: value,
    text,
    caretPosition,
    currentTokenIndex: 0,
    tokens,
  };
}

export function toPrompt(textOrPrompt: string | ParsedPrompt): ParsedPrompt {
  return typeof textOrPrompt === 'string' ? parsePrompt({ text: textOrPrompt }) : textOrPrompt;
}

export function comparePrompts(
  prompt1: ParsedPrompt | string | undefined,
  prompt2: ParsedPrompt | string | undefined,
) {
  const raw1 = !prompt1 || typeof prompt1 === 'string' ? prompt1 : prompt1.raw;
  const raw2 = !prompt2 || typeof prompt2 === 'string' ? prompt2 : prompt2.raw;
  return raw1 === raw2;
}
