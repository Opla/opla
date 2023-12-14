// Copyright 2023 mik
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

import { ChangeEvent, useEffect, KeyboardEvent, MouseEvent } from 'react';
import { PiPaperPlaneRight } from 'react-icons/pi';
import useTranslation from '@/hooks/useTranslation';
import useAutoResizeTextArea from '@/hooks/useAutoResizeTextArea';

export default function Prompt({
  message,
  errorMessage,
  updateMessage,
  handleMessage,
  isLoading,
}: {
  message: string;
  isLoading: boolean;
  errorMessage: string;
  updateMessage: any;
  handleMessage: any;
}) {
  const textAreaRef = useAutoResizeTextArea();
  const { t } = useTranslation();

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = '24px';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [message, textAreaRef]);

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
    <div className="w-full grow-0 !bg-transparent bg-white pt-2 dark:bg-neutral-800">
      <form className="stretch mx-2 flex flex-row gap-3 last:mb-2">
        <div className="relative flex h-full flex-1 flex-col items-stretch">
          {errorMessage ? (
            <div className="mb-2 md:mb-0">
              <div className="m-1 flex h-full w-full justify-center gap-0">
                <span className="text-sm text-red-500">{errorMessage}</span>
              </div>
            </div>
          ) : null}
          <div className="relative flex w-full flex-grow flex-row rounded-md border border-black/10 bg-white p-3 dark:border-neutral-500 dark:bg-neutral-700 dark:text-white">
            <textarea
              ref={textAreaRef}
              value={message}
              tabIndex={0}
              style={{
                height: '24px',
                maxHeight: '200px',
                overflowY: 'hidden',
              }}
              placeholder={t('Send a message...')}
              className="m-0 w-full resize-none border-0 bg-transparent p-0 pl-2 pr-7 focus:outline-none focus:ring-0 focus-visible:ring-0 dark:bg-transparent md:pl-0"
              onChange={handleUpdateMessage}
              onKeyDown={(e) => handleKeypress(e)}
            />
            <button
              disabled={isLoading || message?.length === 0}
              type="button"
              aria-label={t('Send')}
              onClick={handleSendMessage}
              className="rounded-md bg-neutral-500 bg-transparent p-1 text-neutral-400 hover:text-white disabled:bg-neutral-500 disabled:opacity-40 disabled:hover:text-neutral-400"
            >
              <PiPaperPlaneRight className=" h-5 w-5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
