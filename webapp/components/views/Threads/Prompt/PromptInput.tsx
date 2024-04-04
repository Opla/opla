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

// Inspiration
// https://github.com/mxkaske/mxkaske.dev/blob/main/components/craft/fancy-area/write.tsx

import { ChangeEvent, useCallback } from 'react';
import { ParsedPrompt } from '@/utils/parsers';
import { getCurrentWord } from '@/utils/ui/caretposition';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';
import { getTokenColor } from '@/utils/ui';
import { Textarea } from '../../../ui/textarea';

type PromptInputProps = {
  value?: ParsedPrompt;
  placeholder?: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onValueChange: (text: string, caretStartIndex: number) => void;
  className?: string;
  onFocus?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
};

function PromptInput({
  value,
  placeholder,
  textareaRef,
  className,
  onValueChange,
  onFocus,
}: PromptInputProps) {
  const handleChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const { caretStartIndex } = getCurrentWord(textarea);
      onValueChange(textarea.value, caretStartIndex);
    }
  }, [onValueChange, textareaRef]);

  const handleFocus = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      logger.info('focus');
      handleChange();
      onFocus?.(event);
    },
    [handleChange, onFocus],
  );

  return (
    <Textarea
      autoresize
      autoFocus
      tabIndex={0}
      ref={textareaRef}
      autoComplete="off"
      autoCorrect="off"
      className={cn(
        className,
        'focus-visible:ring-none border-none text-transparent shadow-none focus-visible:border-none focus-visible:shadow-none focus-visible:outline-none',
      )}
      value={value?.raw || ''}
      placeholder={placeholder}
      onChange={handleChange}
      onFocus={handleFocus}
    >
      <p className="textarea-overlay pointer-events-none absolute left-[0.01px] top-[0.1px] h-full w-full px-3 py-2 text-sm">
        {value?.tokens?.map((token) =>
          token.type !== 'newline' ? (
            <span key={token.index} className={cn('', getTokenColor(token))}>
              {token.value.replaceAll(' ', '\u00a0')}
            </span>
          ) : (
            <br key={token.index} />
          ),
        )}
      </p>
    </Textarea>
  );
}

export default PromptInput;
