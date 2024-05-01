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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, BrainCircuit } from 'lucide-react';
import { ParsedPrompt, isCommand } from '@/utils/parsers';
import { CommandManager } from '@/utils/commands/types';
import { getCaretCoordinates, getCurrentWord } from '@/utils/ui/caretposition';
import { getCommandType } from '@/utils/commands';
import AvatarView from '@/components/common/AvatarView';
import { Button } from '@/components/ui/button';
import { GrayPill } from '@/components/ui/Pills';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';
import useTranslation from '@/hooks/useTranslation';

type PromptCommandProps = {
  commandManager: CommandManager;
  prompt: ParsedPrompt | undefined;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  children: React.ReactNode;
  onValueChange: (text: string, caretStartIndex: number) => void;
};

function PromptCommandInput({
  commandManager,
  prompt,
  textareaRef,
  children,
  onValueChange,
}: PromptCommandProps) {
  const { t } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [commandValue, setCommandValue] = useState('');
  const [focusIndex, setFocusIndex] = useState(-1);

  const filteredCommands = useMemo(
    () => commandManager.filterCommands(commandValue),
    [commandManager, commandValue],
  );

  const toggleDropdown = (visible = true) => {
    if (visible) {
      dropdownRef.current?.classList.remove('hidden');
    } else {
      setCommandValue('');
      setFocusIndex(-1);
      dropdownRef.current?.classList.add('hidden');
    }
  };

  const isDropdownVisible = () => !dropdownRef.current?.classList.contains('hidden');

  const positionDropdown = useCallback(() => {
    const textarea = textareaRef.current;
    const dropdown = dropdownRef.current;
    if (textarea && dropdown) {
      const parent = textarea.parentElement as HTMLElement;
      const parentRect = parent.getBoundingClientRect();
      const caret = getCaretCoordinates(textarea, textarea.selectionEnd);
      const rect = dropdown.getBoundingClientRect();
      logger.info('caret', caret, rect);
      let x = parentRect.left + caret.left;
      if (x + rect.width > window.innerWidth) {
        x = window.innerWidth - rect.width - 8;
      }
      dropdown.style.transform = `translate(${x}px, ${0 - caret.height}px)`;
      dropdown.style.left = `0px`;
      dropdown.style.bottom = `56px`;
    }
  }, [textareaRef]);

  const updateDisplay = useCallback(() => {
    const textarea = textareaRef.current;
    const dropdown = dropdownRef.current;
    const { activeElement } = document;
    const focused = activeElement === textarea;
    if (textarea && focused && dropdown) {
      const txt = textarea.value;
      const { currentWord } = getCurrentWord(textarea);
      const start = txt.trim().length - currentWord.length;
      if (prompt && !prompt.locked && isCommand(currentWord, start)) {
        setCommandValue(currentWord);
        positionDropdown();
        toggleDropdown();
      } else if (commandValue !== '') {
        toggleDropdown(false);
      }
    } else {
      toggleDropdown(false);
    }
  }, [commandValue, positionDropdown, prompt, textareaRef]);

  useEffect(() => {
    updateDisplay();
  }, [commandValue, positionDropdown, prompt, textareaRef, updateDisplay]);

  const handleCommandSelect = useCallback(
    (newValue: string, close = false) => {
      const textarea = textareaRef.current;
      const dropdown = dropdownRef.current;

      if (textarea && dropdown) {
        const { currentWord, start, text, caretStartIndex } = getCurrentWord(textarea);
        const newText = `${text.substring(0, start)}${newValue} ${text.substring(start + currentWord.length)}`;
        onValueChange(newText, caretStartIndex + 1);
        toggleDropdown(close);
      }
    },
    [onValueChange, textareaRef],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isDropdownVisible()) {
        return;
      }
      if (event.key === 'Escape') {
        setFocusIndex(-1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const index = focusIndex + 1 > filteredCommands.length - 1 ? 0 : focusIndex + 1;
        setFocusIndex(index);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const index = focusIndex - 1 < 0 ? filteredCommands.length - 1 : focusIndex - 1;
        setFocusIndex(index);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (focusIndex >= 0) {
          handleCommandSelect(filteredCommands[focusIndex].value as string);
        }
      }
    },
    [filteredCommands, focusIndex, handleCommandSelect],
  );

  const handleBlur = useCallback(() => {
    if (isDropdownVisible()) {
      toggleDropdown(false);
    }
  }, []);

  const handleFocus = useCallback(() => {
    if (isDropdownVisible()) {
      updateDisplay();
    }
  }, [updateDisplay]);

  const handleMouseDown = useCallback((e: Event) => {
    if (isDropdownVisible()) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleMouseMove = useCallback(() => {
    if (focusIndex !== -1) {
      setFocusIndex(-1);
    }
  }, [focusIndex]);

  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    const dropdown = dropdownRef.current;

    if (textarea && dropdown) {
      const { currentWord } = getCurrentWord(textarea);

      const start = textarea.value.trim().length - currentWord.length;
      const isaCommand = isCommand(currentWord, start);
      // logger.info('focus handleSelectionChange', isaCommand, commandValue);
      if (!isaCommand && commandValue !== '') {
        toggleDropdown(false);
      } else if (isaCommand) {
        setCommandValue(currentWord);
        positionDropdown();
        toggleDropdown();
      }
    }
  }, [commandValue, positionDropdown, textareaRef]);

  useEffect(() => {
    const textarea = textareaRef.current;
    const dropdown = dropdownRef.current;
    textarea?.addEventListener('keydown', handleKeyDown);
    textarea?.addEventListener('blur', handleBlur);
    textarea?.addEventListener('focus', handleFocus);
    document?.addEventListener('selectionchange', handleSelectionChange);
    document?.addEventListener('mousemove', handleMouseMove);
    dropdown?.addEventListener('mousedown', handleMouseDown);
    return () => {
      textarea?.removeEventListener('keydown', handleKeyDown);
      textarea?.removeEventListener('blur', handleBlur);
      textarea?.removeEventListener('focus', handleFocus);
      document?.removeEventListener('selectionchange', handleSelectionChange);
      document?.removeEventListener('mousemove', handleMouseMove);
      dropdown?.removeEventListener('mousedown', handleMouseDown);
    };
  });

  const commandType = getCommandType(commandValue);
  const notFound = commandType ? `No ${commandType}s found.` : '';
  return (
    <div className="h-full w-full overflow-visible">
      {children}
      <div
        ref={dropdownRef}
        className={cn(
          'absolute hidden h-auto min-w-[240px] max-w-[320px] overflow-visible rounded-md border bg-popover p-0 text-popover-foreground shadow',
        )}
      >
        <div className="w-full gap-2">
          {filteredCommands.length === 0 && (
            <div className="rounded-sm px-2 py-1.5 text-left text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
              {t(notFound)}
            </div>
          )}
          {filteredCommands.length > 0 &&
            filteredCommands.map((item, index) => (
              <Button
                variant="ghost"
                aria-selected={focusIndex === index}
                key={item.key || item.label}
                onClick={(event) => {
                  event.preventDefault();
                  handleCommandSelect(item.value as string);
                }}
                className={cn(
                  'ellipsis flex w-full cursor-pointer select-none flex-row-reverse items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  focusIndex !== -1 ? 'hover:bg-transparent' : '',
                )}
              >
                <div className="flex w-full flex-row content-between items-center gap-2">
                  {item.avatar && <AvatarView avatar={item.avatar} className="h-4 w-4" />}
                  {!item.avatar && item.group === 'models' && (
                    <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                  )}
                  {!item.avatar && item.group === 'assistants' && (
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="flex-1">{item.label} </div>
                  {item.group === 'models' && <GrayPill label={t('Model')} />}
                  {item.group === 'assistants' && <GrayPill label={t('Assistant')} />}
                </div>
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}

export default PromptCommandInput;
