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

import { ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import { AlertTriangle, Loader2, SendHorizontal } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

export default function Prompt({
  conversationId,
  message,
  errorMessage,
  updateMessage,
  handleMessage,
  isLoading,
}: {
  conversationId: string;
  message: string;
  isLoading: boolean;
  errorMessage: string;
  updateMessage: any;
  handleMessage: any;
}) {
  const { t } = useTranslation();

  const handleSendMessage = (e: MouseEvent) => {
    e.preventDefault();
    handleMessage();
  };

  const handleKeypress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessage();
    }
  };

  const handleUpdateMessage = (e: ChangeEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    updateMessage(e.target.value);
  };

  return (
    <div className="w-full grow-0 !bg-transparent dark:bg-neutral-800">
      <form className="mx-2 flex flex-col gap-2 last:mb-2">
        {errorMessage ? (
          <div className="m-1 flex w-full items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-500">{errorMessage}</span>
          </div>
        ) : null}
        <div className="flex w-full flex-row items-center rounded-md border border-black/10 bg-white p-3 dark:border-neutral-500 dark:bg-neutral-700 dark:text-white">
          <Textarea
            autoresize
            value={message}
            key={conversationId}
            tabIndex={0}
            placeholder={t('Send a message...')}
            className="m-0 max-h-[200px] min-h-[32px] w-full resize-none overflow-y-hidden border-0 bg-transparent px-3 py-1.5 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent dark:text-white dark:placeholder-white"
            onChange={handleUpdateMessage}
            onKeyDown={(e) => handleKeypress(e)}
          />
          <Button
            disabled={isLoading || message?.length === 0}
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
        </div>
      </form>
    </div>
  );
}
