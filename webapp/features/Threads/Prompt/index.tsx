// Copyright 2023 Mik Bry
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

'use client';

import { ChangeEvent, MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Paperclip, SendHorizontal } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import { KeyBinding, ShortcutIds, defaultShortcuts } from '@/hooks/useShortcuts';
import logger from '@/utils/logger';
import { getCaretPosition } from '@/utils/ui/caretposition';
import { CommandManager } from '@/utils/commands/types';
import {
  getConversation,
  updateConversation,
  addAssetsToConversation,
} from '@/utils/data/conversations';
import { createMessage, mergeMessages } from '@/utils/data/messages';
import { openFileDialog } from '@/utils/backend/tauri';
import { getFileAssetExtensions } from '@/utils/backend/commands';
import { toast } from '@/components/ui/Toast';
import { parsePrompt } from '@/utils/parsers';
import { useThreadStore } from '@/stores';
import { Button } from '../../../components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';
import { ShortcutBadge } from '../../../components/common/ShortCut';
import PromptInput from './PromptInput';
import PromptCommands from './PromptCommands';
import { usePromptContext } from './PromptContext';
import { useConversationContext } from '../Conversation/ConversationContext';

export type PromptProps = {
  conversationId: string;
  hasMessages: boolean;
  commandManager: CommandManager;
  isModelLoading: boolean | undefined;
  disabled: boolean;
};

export default function Prompt({
  conversationId,
  hasMessages,
  commandManager,
  disabled,
  isModelLoading,
}: PromptProps) {
  const { t } = useTranslation();
  const {
    isProcessing,
    errorMessages,
    handleSendMessage: sendMessage,
    handleCancelSending,
  } = useConversationContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [needFocus, setNeedFocus] = useState(false);
  const { usage, changedPrompt, conversationPrompt, setChangedPrompt, tokenValidator } =
    usePromptContext();
  const prompt = changedPrompt === undefined ? conversationPrompt : changedPrompt;
  const errorMessage = errorMessages[conversationId];

  const { conversations, updateConversations, messages, updateConversationMessages } =
    useThreadStore();

  const handleCancel = (e: MouseEvent) => {
    e.preventDefault();
    handleCancelSending(conversationId, undefined);
  };

  const handleSendMessage = (e: MouseEvent) => {
    e.preventDefault();
    if (prompt) {
      logger.info('sending message', conversationId, prompt);
      sendMessage(prompt);
    }
  };

  const handleUploadFile = async (e: MouseEvent) => {
    e.preventDefault();
    const conversation = getConversation(conversationId, conversations);
    if (conversation) {
      const extensions = await getFileAssetExtensions();
      const files = await openFileDialog(false, [{ name: 'conversations', extensions }]);
      if (files) {
        const { conversation: updatedConversation, assets } = await addAssetsToConversation(
          conversation,
          files,
        );
        if (assets.length === 0 && files) {
          toast.error(
            `${t('File is already present')}: ${Array.isArray(files) ? files.join(',') : files}`,
          );
        } else {
          const message = createMessage(
            { role: 'user', name: 'you' },
            undefined,
            undefined,
            assets,
          );
          const conversationMessages = messages[updatedConversation.id];
          const updatedMessages = mergeMessages(conversationMessages, [message]);
          await updateConversationMessages(updatedConversation.id, updatedMessages);
          const updatedConversations = updateConversation(updatedConversation, conversations);
          await updateConversations(updatedConversations);
        }
      }
    }
  };

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if ((isModelLoading || isModelLoading === undefined) && !needFocus) {
      setNeedFocus(true);
    }
    if (needFocus && isModelLoading === false && !disabled && textareaRef.current) {
      setNeedFocus(false);
      textareaRef.current?.focus();
      timeoutRef.current = setTimeout(() => {
        textareaRef.current?.focus();
        timeoutRef.current = undefined;
      }, 500);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // setNeedFocus(true);
        timeoutRef.current = undefined;
      }
    };
  }, [needFocus, disabled, isModelLoading]);

  const handleKeypress = (e: KeyboardEvent) => {
    if (!tokenValidator) return;
    const textarea = e.target as HTMLTextAreaElement;
    const { caretStartIndex } = getCaretPosition(textarea);
    const value = `${textarea.value} \n`;
    const newPrompt = parsePrompt({ text: value, caretStartIndex }, tokenValidator);
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      setChangedPrompt(newPrompt);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(newPrompt);
    }
  };

  const handleValueChange = useCallback(
    (text: string, caretStartIndex: number) => {
      const parsedPrompt = parsePrompt({ text, caretStartIndex }, tokenValidator);
      if (prompt?.raw !== text) {
        setChangedPrompt(parsedPrompt);
      }
    },
    [tokenValidator, prompt, setChangedPrompt],
  );

  const handleFocus = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const lengthOfInput = event.target.value.length;
    event.currentTarget.setSelectionRange(lengthOfInput, lengthOfInput);
    const newPrompt = parsePrompt({ textarea: event.target }, tokenValidator);
    setChangedPrompt(newPrompt);
  };

  const shortcutSend: KeyBinding = defaultShortcuts.find(
    (s) => s.command === ShortcutIds.SEND_MESSAGE,
  ) as KeyBinding;
  const shortcutNewLine: KeyBinding = defaultShortcuts.find(
    (s) => s.command === ShortcutIds.NEW_LINE,
  ) as KeyBinding;

  if (!prompt && !hasMessages) {
    return undefined;
  }

  const isConnected = conversationId ? isProcessing[conversationId] || false : false;
  let isLoading = false;
  let placeholder;
  if (isModelLoading || isModelLoading === undefined) {
    isLoading = true;
    if (isModelLoading) {
      placeholder = t('Loading the model, Please wait...');
    }
  }

  return (
    <div className="w-full grow-0 bg-transparent!">
      <form className="mx-2 flex flex-col gap-2 last:mb-2">
        {(errorMessage || usage) && (
          <div className="m-1 flex w-full items-center justify-between gap-2">
            {errorMessage && (
              <div className="flex w-full items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-error" />
                <span className="text-xs text-error">{errorMessage}</span>
              </div>
            )}
            {usage && usage.tokenCount > 0 && usage.activeService && usage.activeService.model && (
              <div className="flex w-full flex-row-reverse items-center gap-2 pr-4">
                <span className="text-xs text-muted-foreground">
                  {usage.activeService.model.title || usage.activeService.model.name} /{' '}
                  {usage.tokenCount} {t('tokens')}
                </span>
              </div>
            )}
          </div>
        )}
        <div className="flex w-full flex-row items-center rounded-md border border-input p-3 focus-within:border-transparent focus-within:ring-1 focus-within:ring-ring">
          <Button
            disabled={disabled || isLoading}
            type="button"
            aria-label={t('Upload')}
            onClick={handleUploadFile}
            className=""
            size="icon"
            variant="ghost"
          >
            <Paperclip className="strokeWidth={1.5} h-4 w-4" />
          </Button>
          <PromptCommands
            commandManager={commandManager}
            prompt={prompt}
            textareaRef={textareaRef}
            onValueChange={handleValueChange}
          >
            <PromptInput
              value={prompt}
              textareaRef={textareaRef}
              placeholder={placeholder || t('Send a message...')}
              className="max-h-[240px] min-h-[36px]"
              onValueChange={handleValueChange}
              onFocus={handleFocus}
              onKeyDown={handleKeypress}
              disabled={isLoading || isConnected || disabled}
            />
          </PromptCommands>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={isLoading || (prompt?.raw?.length === 0 && !isConnected)}
                type="button"
                aria-label={t('Send')}
                onClick={isConnected ? handleCancel : handleSendMessage}
                className="ml-2"
                size="icon"
                variant="outline"
              >
                {isLoading || isConnected ? (
                  <Loader2 strokeWidth={1.5} className="loading-icon h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="strokeWidth={1.5} h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="mt-1">
              {!isLoading && !isConnected && (
                <>
                  <div className="flex w-full flex-row items-center justify-between gap-2 pb-2">
                    <p>{t(shortcutSend.description)}</p>
                    <ShortcutBadge command={shortcutSend.command} />
                  </div>
                  <div className="flex w-full flex-row items-center justify-between gap-2">
                    <p>{t(shortcutNewLine.description)}</p>
                    <ShortcutBadge command={shortcutNewLine.command} />
                  </div>
                </>
              )}
              {isLoading && (
                <div className="flex w-full flex-row items-center justify-between gap-2 pb-2">
                  <p>{t('Please wait...')}</p>
                </div>
              )}
              {isProcessing && (
                <div className="flex w-full flex-row items-center justify-between gap-2 pb-2">
                  <p>{t('Cancel')}</p>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      </form>
    </div>
  );
}
