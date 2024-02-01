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

import { useState } from 'react';
import {
  Check,
  Clipboard,
  Bot,
  MoreHorizontal,
  User,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { getContent } from '@/utils/data';
import useHover from '@/hooks/useHover';
import useMarkdownProcessor from '@/hooks/useMarkdownProcessor';
import { Message } from '@/types';
import { Button } from '../ui/button';

type MessageComponentProps = {
  message: Message;
  onResendMessage: () => void;
};

function ClipboardButton({
  onCopyToClipboard,
  isCopied,
}: {
  onCopyToClipboard: () => void;
  isCopied: boolean;
}) {
  return (
    <Button disabled={isCopied} variant="ghost" size="sm" onClick={onCopyToClipboard}>
      {isCopied ? (
        <Check className="h-4 w-4" strokeWidth={1.5} />
      ) : (
        <Clipboard className="h-4 w-4" strokeWidth={1.5} />
      )}
    </Button>
  );
}

function MessageComponent({ message, onResendMessage }: MessageComponentProps) {
  const [ref, isHover] = useHover();
  const [isCopied, setIsCopied] = useState(false);

  const { author } = message;
  const content = getContent(message.content);
  const Content = useMarkdownProcessor(content as string);
  const isUser = author.role === 'user';

  const onCopyToClipboard = () => {
    if (typeof content === 'string') {
      navigator.clipboard.writeText(content);
      setIsCopied(true);
    }
  };

  const isProcessing = message.status === 'pending';

  return (
    <div
      ref={ref}
      className={`group relative w-full text-neutral-800 dark:text-neutral-100 hover:dark:bg-neutral-900 ${isUser ? '' : ''}`}
    >
      <div className="m-auto flex w-full gap-4 text-base md:max-w-2xl md:gap-6 lg:max-w-xl lg:px-0 xl:max-w-3xl">
        <div className="m-auto flex w-full flex-row gap-4 p-4 md:max-w-2xl md:gap-6 md:py-6 lg:max-w-xl lg:px-0 xl:max-w-3xl">
          <div className="flex w-8 flex-col items-end">
            <div className="text-opacity-100r flex h-7 w-7 items-center justify-center rounded-md p-1 text-white">
              {isUser ? (
                <User className="h-4 w-4 text-white" />
              ) : (
                <Bot className="h-4 w-4 text-white" />
              )}
            </div>
          </div>
          <div className="flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
            <div className="flex flex-grow flex-col gap-3">
              <div className="flex min-h-20 flex-col items-start gap-4 whitespace-pre-wrap break-words">
                <div className="w-full break-words">
                  <p className="font-bold capitalize">{author.name}</p>
                  {!isUser && (content === '...' || isProcessing) ? (
                    <div className="pt-2">
                      <MoreHorizontal className="h-4 w-4 animate-pulse" />
                    </div>
                  ) : (
                    <div className="select-auto pb-4 pt-2">{Content}</div>
                  )}
                </div>
                {isHover && !isProcessing && (
                  <div className="left-30 absolute bottom-0">
                    {isUser ? (
                      <>
                        <ClipboardButton
                          isCopied={isCopied}
                          onCopyToClipboard={onCopyToClipboard}
                        />
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={onResendMessage}>
                          <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                        <ClipboardButton
                          isCopied={isCopied}
                          onCopyToClipboard={onCopyToClipboard}
                        />
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageComponent;
