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

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { getCaretCoordinates, getCurrentWord, replaceWord } from '@/utils/caretPosition';
import { Ui } from '@/types';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';
import { Command, CommandGroup, CommandItem } from '../ui/command';
import { Textarea } from '../ui/textarea';

type PromptCommandProps = {
  value?: string;
  placeholder?: string;
  commands: Ui.MenuItem[];
  onChange?: (value: string) => void;
  className?: string;
  onFocus?: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  // onCommandSelect: (value: string) => void;
};

function PromptCommand({
  value,
  placeholder,
  commands,
  className,
  onChange,
  onFocus,
}: PromptCommandProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [commandValue, setCommandValue] = useState('');

  const toggleDropdown = (visible = true) => {
    if (visible) {
      dropdownRef.current?.classList.remove('hidden');
    } else {
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
      dropdown.style.left = `${caret.left}px`;
      dropdown.style.top = `${caret.top - rect.height}px`;
    }
  }, []);

  useEffect(() => {
    positionDropdown();
  }, [commandValue, positionDropdown]);

  const handleBlur = useCallback(() => {
    const dropdown = dropdownRef.current;
    if (dropdown) {
      // dropdown.classList.add('hidden');
      // toggleDropdown(false);
      setCommandValue('');
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const textarea = textareaRef.current;
    const input = inputRef.current;
    const dropdown = dropdownRef.current;
    if (textarea && input && dropdown) {
      const currentWord = getCurrentWord(textarea);
      const isDropdownHidden = dropdown.classList.contains('hidden');
      if (currentWord.startsWith('@') && !isDropdownHidden) {
        if (
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'Enter' ||
          e.key === 'Escape'
        ) {
          e.preventDefault();
          input.dispatchEvent(new KeyboardEvent('keydown', e));
        }
      }
    }
  }, []);

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      const textarea = textareaRef.current;
      const dropdown = dropdownRef.current;

      if (textarea && dropdown) {
        const currentWord = getCurrentWord(textarea);
        onChange?.(text);
        logger.info({ currentWord });
        if (currentWord.startsWith('@')) {
          setCommandValue(currentWord);
          positionDropdown();
          // dropdown.classList.remove('hidden');
          toggleDropdown();
        } else if (commandValue !== '') {
          setCommandValue('');
          // dropdown.classList.add('hidden');
          toggleDropdown(false);
        }
      }
    },
    [onChange, commandValue, positionDropdown],
  );

  const onCommandSelect = useCallback((newValue: string) => {
    const textarea = textareaRef.current;
    const dropdown = dropdownRef.current;
    if (textarea && dropdown) {
      replaceWord(textarea, `${newValue}`);
      setCommandValue('');
      // dropdown.classList.add('hidden');
      toggleDropdown(false);
    }
  }, []);

  const handleMouseDown = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    const dropdown = dropdownRef.current;
    if (textarea && dropdown) {
      const currentWord = getCurrentWord(textarea);
      logger.info(currentWord);
      if (!currentWord.startsWith('@') && commandValue !== '') {
        setCommandValue('');
        // dropdown.classList.add('hidden');
        toggleDropdown(false);
      }
    }
  }, [commandValue]);

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

  return (
    <div className="relative h-full w-full overflow-visible">
      <Textarea
        autoresize
        autoFocus
        tabIndex={0}
        ref={textareaRef}
        autoComplete="off"
        autoCorrect="off"
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={handleValueChange}
        rows={5}
        onFocus={onFocus}
      />
      <Command
        ref={dropdownRef}
        className={cn(
          'absolute hidden h-auto max-w-[320px] overflow-visible border border-popover shadow',
        )}
      >
        {/* REMINDER: className="hidden" won't hide the SearchIcon and border */}
        {/* <CommandInput ref={inputRef} value={commandValue} /> */}
        <CommandGroup className="h-full">
          {commands.map((item) => (
            <CommandItem
              key={item.label}
              value={item.value}
              onSelect={onCommandSelect}
              className="ellipsis flex w-full flex-row-reverse items-center gap-2"
            >
              <div className="grow">{item.label}</div>
            </CommandItem>
          ))}
        </CommandGroup>
      </Command>
    </div>
  );
}

export default PromptCommand;
