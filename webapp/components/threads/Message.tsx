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

import { useState, useRef } from 'react';
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
import useTranslation from '@/hooks/useTranslation';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

function ClipboardButton({
  onCopyToClipboard,
  copied,
}: {
  onCopyToClipboard: () => void;
  copied: boolean;
}) {
  return (
    <Button disabled={copied} variant="ghost" size="sm" onClick={onCopyToClipboard}>
      {copied ? (
        <Check className="h-4 w-4" strokeWidth={1.5} />
      ) : (
        <Clipboard className="h-4 w-4" strokeWidth={1.5} />
      )}
    </Button>
  );
}

function DeleteButton({ onDeleteMessage }: { onDeleteMessage: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onDeleteMessage}>
      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
    </Button>
  );
}

enum MessageState {
  Markdown,
  Text,
  Pending,
  Edit,
}

type MessageComponentProps = {
  message: Message;
  onResendMessage: () => void;
  onDeleteMessage: () => void;
  onChangeContent: (content: string, submit: boolean) => void;
};

function MessageComponent({
  message,
  onResendMessage,
  onDeleteMessage,
  onChangeContent,
}: MessageComponentProps) {
  const { t } = useTranslation();
  const [ref, isHover] = useHover();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [edit, setEdit] = useState<string | undefined>(undefined);

  const { author } = message;
  const content = getContent(message.content);
  const Content = useMarkdownProcessor(content as string);
  const isUser = author.role === 'user';

  const onCopyToClipboard = () => {
    if (typeof content === 'string') {
      navigator.clipboard.writeText(content);
      setCopied(true);
    }
  };

  const onEdit = () => {
    setEdit(content);
  };

  const onSave = () => {
    const newContent = inputRef.current?.value;
    if (newContent && content !== newContent) {
      onChangeContent(newContent, isUser);
    }
    setEdit(undefined);
  };

  const onCancelEdit = () => {
    setEdit(undefined);
  };

  let state = MessageState.Markdown;
  if (edit !== undefined) {
    state = MessageState.Edit;
  } else if (isUser) {
    state = MessageState.Text;
  } else if (message.status === 'pending' || content === '...') {
    state = MessageState.Pending;
  }

  return (
    <div
      ref={ref}
      className={`group relative w-full text-neutral-800 dark:text-neutral-100 hover:dark:bg-neutral-900 ${isUser ? '' : ''}`}
    >
      <div className="m-auto flex w-full gap-4 font-sans text-sm md:max-w-2xl md:gap-6 lg:max-w-xl lg:px-0 xl:max-w-3xl">
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
                  <p className="mx-4 font-bold capitalize">{author.name}</p>
                  {state === MessageState.Pending && (
                    <div className="px-4 py-2">
                      <MoreHorizontal className="h-4 w-4 animate-pulse" />
                    </div>
                  )}
                  {state === MessageState.Markdown && (
                    <div className="my-4 w-full select-auto px-3 py-2">{Content}</div>
                  )}
                  {state === MessageState.Text && (
                    <div className="my-4 w-full select-auto px-3 py-2">{content}</div>
                  )}
                  {state === MessageState.Edit && (
                    <Textarea
                      ref={inputRef}
                      className="my-4 w-full resize-none  px-3 py-2 text-sm"
                      value={edit !== undefined ? edit : content}
                      onChange={(e) => {
                        setEdit(e.target.value);
                      }}
                    />
                  )}
                </div>
                {(state === MessageState.Markdown || state === MessageState.Text) && isHover && (
                  <div className="left-30 absolute bottom-0">
                    {!isUser && (
                      <Button variant="ghost" size="sm" onClick={onResendMessage}>
                        <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    )}
                    <ClipboardButton copied={copied} onCopyToClipboard={onCopyToClipboard} />
                    <Button variant="ghost" size="sm" onClick={onEdit}>
                      <Pencil className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                    <DeleteButton onDeleteMessage={onDeleteMessage} />
                  </div>
                )}
                {state === MessageState.Edit && (
                  <div className="left-30 absolute bottom-0 flex flex-row gap-2">
                    <Button size="sm" onClick={onSave} disabled={!edit}>
                      {isUser ? t('Save & submit') : t('Save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={onCancelEdit}>
                      {t('Cancel')}
                    </Button>
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
