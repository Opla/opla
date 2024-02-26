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

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isCommand, ParsedPrompt, parsePrompt, TokenValidator } from '@/utils/prompt';
import { getCaretCoordinates, getCurrentWord } from '@/utils/caretposition';
import { Ui } from '@/types';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';
import useTranslation from '@/hooks/useTranslation';
import { getTokenColor } from '@/utils/ui';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

type PromptCommandProps = {
  value?: ParsedPrompt;
  placeholder?: string;
  notFound?: string;
  commands: Ui.MenuItem[];
  onChange?: (parsedPrompt: ParsedPrompt) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  className?: string;
  onFocus?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onCommandSelect?: (value: string) => void;
  tokenValidate: TokenValidator;
};

function PromptCommand({
  value,
  placeholder,
  notFound = 'No command found.',
  commands,
  className,
  onChange,
  onFocus,
  onKeyDown,
  onCommandSelect,
  tokenValidate,
}: PromptCommandProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [commandValue, setCommandValue] = useState('');

  const toggleDropdown = (visible = true) => {
    if (visible) {
      dropdownRef.current?.classList.remove('hidden');
    } else {
      setCommandValue('');
      dropdownRef.current?.classList.add('hidden');
    }
  };

  const positionDropdown = useCallback(() => {
    const textarea = textareaRef.current;
    const dropdown = dropdownRef.current;
    if (textarea && dropdown) {
      const caret = getCaretCoordinates(textarea, textarea.selectionEnd);
      const rect = dropdown.getBoundingClientRect();
      logger.info('caret', caret, rect);
      dropdown.style.transform = `translate(${caret.left}px, ${-caret.top - caret.height - 4}px)`;
      dropdown.style.left = `0px`;
      dropdown.style.bottom = `0px`;
    }
  }, []);

  useEffect(() => {
    positionDropdown();
  }, [commandValue, positionDropdown]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      onKeyDown(event);
    },
    [onKeyDown],
  );

  const valueChange = useCallback(
    (text: string, caretStartIndex: number) => {
      const parsedPrompt = parsePrompt({ text, caretStartIndex }, tokenValidate);
      if (value?.raw !== text) {
        onChange?.(parsedPrompt);
      }
    },
    [onChange, value, tokenValidate],
  );

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      const textarea = textareaRef.current;
      const dropdown = dropdownRef.current;

      if (textarea && dropdown) {
        const { currentWord, caretStartIndex } = getCurrentWord(textarea);
        valueChange(text, caretStartIndex);
        const start = value?.text.trim().length || 0;
        logger.info('value length', start);
        if (isCommand(currentWord, start)) {
          logger.info('isCommand', currentWord, start, commandValue);
          setCommandValue(currentWord);
          positionDropdown();
          toggleDropdown();
        } else if (commandValue !== '') {
          toggleDropdown(false);
        }
      }
    },
    [commandValue, positionDropdown, value?.text, valueChange],
  );

  const handleCommandSelect = useCallback(
    (newValue: string) => {
      const textarea = textareaRef.current;
      const dropdown = dropdownRef.current;
      if (textarea && dropdown) {
        const { currentWord, start, text, caretStartIndex } = getCurrentWord(textarea);
        const newText = `${text.substring(0, start)}${newValue} ${text.substring(start + currentWord.length)}`;
        valueChange(newText, caretStartIndex + 1);
        toggleDropdown(false);
        onCommandSelect?.(newValue);
      }
    },
    [onCommandSelect, valueChange],
  );

  const handleBlur = useCallback(() => {
    const dropdown = dropdownRef.current;
    if (dropdown) {
      toggleDropdown(false);
    }
  }, []);

  const handleFocus = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      logger.info('focus');
      handleValueChange(event);
      onFocus?.(event);
    },
    [handleValueChange, onFocus],
  );

  const handleMouseDown = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    const dropdown = dropdownRef.current;
    if (textarea && dropdown) {
      const { currentWord } = getCurrentWord(textarea);

      const start = value?.text.trim().length || 0;
      logger.info('isCommand selection change', currentWord, commandValue, start);
      if (!isCommand(currentWord, start) && commandValue !== '') {
        toggleDropdown(false);
      }
    }
  }, [commandValue, value?.text]);

  useEffect(() => {
    const textarea = textareaRef.current;
    const dropdown = dropdownRef.current;
    textarea?.addEventListener('keydown', handleKeyDown);
    textarea?.addEventListener('blur', handleBlur);
    document?.addEventListener('selectionchange', handleSelectionChange);
    dropdown?.addEventListener('mousedown', handleMouseDown);
    return () => {
      textarea?.removeEventListener('keydown', handleKeyDown);
      textarea?.removeEventListener('blur', handleBlur);
      document?.removeEventListener('selectionchange', handleSelectionChange);
      dropdown?.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleBlur, handleKeyDown, handleMouseDown, handleSelectionChange]);

  const filteredCommands = useMemo(
    () =>
      commands.filter(
        (c) => !(!c.value || c.value?.toLowerCase().indexOf(commandValue.toLowerCase()) === -1),
      ),
    [commands, commandValue],
  );
  return (
    <div className="relative h-full w-full overflow-visible">
      <Textarea
        autoresize
        autoFocus
        tabIndex={0}
        ref={textareaRef}
        autoComplete="off"
        autoCorrect="off"
        className={cn(className, 'text-transparent dark:text-transparent')}
        value={value?.raw || ''}
        placeholder={placeholder}
        onChange={handleValueChange}
        rows={5}
        onFocus={handleFocus}
      />
      <p className="textarea-overlay pointer-events-none absolute bottom-[6px] left-[12px] w-full text-sm">
        {value?.tokens?.map((token) =>
          token.type !== 'newline' ? (
            <span key={token.index} className={getTokenColor(token)}>
              {token.value}
            </span>
          ) : (
            <br key={token.index} />
          ),
        )}
      </p>
      <div
        ref={dropdownRef}
        className={cn(
          'absolute hidden h-auto min-w-[240px] max-w-[320px] overflow-visible rounded-md border bg-popover p-0 text-popover-foreground shadow',
        )}
      >
        <div className="gap-2">
          {filteredCommands.length === 0 && <div>{t(notFound)}</div>}
          {filteredCommands.length > 0 &&
            filteredCommands.map((item) => (
              <Button
                variant="ghost"
                key={item.label}
                onClick={(event) => {
                  event.preventDefault();
                  handleCommandSelect(item.value as string);
                }}
                className="ellipsis flex flex w-full cursor-pointer select-none flex-row-reverse items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <div className="w-full grow">{item.label}</div>
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}

export default PromptCommand;
