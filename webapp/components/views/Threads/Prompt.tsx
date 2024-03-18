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

import { ChangeEvent, MouseEvent, useContext } from 'react';
import { AlertTriangle, Loader2, Paperclip, SendHorizontal } from 'lucide-react';
import { AppContext } from '@/context';
import useTranslation from '@/hooks/useTranslation';
import { KeyBinding, ShortcutIds, defaultShortcuts } from '@/hooks/useShortcuts';
import logger from '@/utils/logger';
import { ParsedPrompt, TokenValidator, parsePrompt } from '@/utils/parsers';
import { getCaretPosition } from '@/utils/ui/caretposition';
import { CommandManager } from '@/utils/commands/types';
import {
  getConversation,
  updateConversation,
  addAssetsToConversation,
} from '@/utils/data/conversations';
import { createMessage, mergeMessages } from '@/utils/data/messages';
import { openFileDialog } from '@/utils/backend/tauri';
import { AIImplService } from '@/types';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { ShortcutBadge } from '../../common/ShortCut';
import PromptCommandInput from './PromptCommandInput';

export type PromptProps = {
  conversationId: string;
  prompt: ParsedPrompt;
  commandManager: CommandManager;
  isLoading: boolean;
  errorMessage: string;
  disabled: boolean;
  onUpdatePrompt: (prompt: ParsedPrompt) => void;
  onSendMessage: (prompt?: ParsedPrompt) => void;
  tokenValidate: TokenValidator;
  usage: { tokenCount: number, activeService?: AIImplService } | undefined;
};

export default function Prompt({
  conversationId,
  prompt,
  commandManager,
  errorMessage,
  disabled,
  onUpdatePrompt,
  onSendMessage,
  tokenValidate,
  isLoading,
  usage,
}: PromptProps) {
  const { t } = useTranslation();

  const {
    conversations,
    updateConversations,
    getConversationMessages,
    updateConversationMessages,
  } = useContext(AppContext);

  const handleSendMessage = (e: MouseEvent) => {
    e.preventDefault();
    logger.info('sending message', conversationId);
    onSendMessage();
  };

  const handleUploadFile = async (e: MouseEvent) => {
    e.preventDefault();
    const conversation = getConversation(conversationId, conversations);
    if (conversation) {
      const files = await openFileDialog(false, [
        { name: 'conversations', extensions: ['pdf', 'txt', 'csv', 'json', 'md'] },
      ]);
      if (files) {
        const { conversation: updatedConversation, assets } = addAssetsToConversation(
          conversation,
          files,
        );
        const message = createMessage({ role: 'user', name: 'you' }, undefined, undefined, assets);
        const conversationMessages = getConversationMessages(conversationId);
        const updatedMessages = mergeMessages(conversationMessages, [message]);
        updateConversationMessages(conversationId, updatedMessages);
        const updatedConversations = updateConversation(updatedConversation, conversations, true);
        updateConversations(updatedConversations);
      }
    }
  };

  const handleKeypress = (e: KeyboardEvent) => {
    const textarea = e.target as HTMLTextAreaElement;
    const { caretStartIndex } = getCaretPosition(textarea);
    const value = `${textarea.value} \n`;
    const newPrompt = parsePrompt({ text: value, caretStartIndex }, tokenValidate);
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      onUpdatePrompt(newPrompt);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(newPrompt);
    }
  };

  const handleUpdateMessage = (newValue: ParsedPrompt) => {
    onUpdatePrompt(newValue);
  };

  const handleFocus = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const lengthOfInput = event.target.value.length;
    event.currentTarget.setSelectionRange(lengthOfInput, lengthOfInput);
    const newPrompt = parsePrompt({ textarea: event.target }, tokenValidate);
    onUpdatePrompt(newPrompt);
  };

  const shortcutSend: KeyBinding = defaultShortcuts.find(
    (s) => s.command === ShortcutIds.SEND_MESSAGE,
  ) as KeyBinding;
  const shortcutNewLine: KeyBinding = defaultShortcuts.find(
    (s) => s.command === ShortcutIds.NEW_LINE,
  ) as KeyBinding;

  return (
    <div className="w-full grow-0 !bg-transparent ">
      <form className="mx-2 flex flex-col gap-2 last:mb-2">
        {errorMessage && (
          <div className="m-1 flex w-full items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-500">{errorMessage}</span>
          </div>
        )}
        {(usage && usage.activeService && usage.activeService.model) && (
          <div className="m-1 flex w-full flex-row-reverse items-center gap-2 pr-4">
            <span className="text-xs text-muted-foreground">
              {usage.activeService.model.title || usage.activeService.model.name} / {usage.tokenCount} {t('tokens')}
            </span>
          </div>
        )}
        <div className="flex w-full flex-row items-center  rounded-md border border-input p-3 focus-within:border-transparent focus-within:ring-1 focus-within:ring-ring ">
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
          <PromptCommandInput
            value={prompt}
            commandManager={commandManager}
            placeholder={t('Send a message...')}
            className="m-0 max-h-[240px] min-h-[36px] "
            onChange={handleUpdateMessage}
            onFocus={handleFocus}
            onKeyDown={handleKeypress}
            tokenValidate={tokenValidate}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={isLoading || prompt?.raw?.length === 0}
                type="button"
                aria-label={t('Send')}
                onClick={handleSendMessage}
                className="ml-2"
                size="icon"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 strokeWidth={1.5} className="loading-icon h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="strokeWidth={1.5} h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="mt-1">
              <div className="flex w-full flex-row items-center justify-between gap-2 pb-2">
                <p>{t(shortcutSend.description)}</p>
                <ShortcutBadge command={shortcutSend.command} />
              </div>
              <div className="flex w-full flex-row items-center justify-between gap-2">
                <p>{t(shortcutNewLine.description)}</p>
                <ShortcutBadge command={shortcutNewLine.command} />
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </form>
    </div>
  );
}
