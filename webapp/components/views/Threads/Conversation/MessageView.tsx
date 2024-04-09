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

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import {
  Bot,
  MoreHorizontal,
  User,
  Pencil,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  File,
} from 'lucide-react';
import {
  getMessageContentAuthorAsString,
  getMessageContentHistoryAsString,
} from '@/utils/data/messages';
import useHover from '@/hooks/useHover';
import useMarkdownProcessor from '@/hooks/useMarkdownProcessor/index';
import { Avatar, AvatarRef, Message, MessageStatus } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import AvatarView from '@/components/common/AvatarView';
import CopyToClipBoard from '@/components/common/CopyToClipBoard';
import { Button } from '../../../ui/button';
import { Textarea } from '../../../ui/textarea';
import OpenAI from '../../../icons/OpenAI';

function DeleteButton({ onDeleteMessage }: { onDeleteMessage: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onDeleteMessage}>
      <Trash2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
    </Button>
  );
}

function AvatarIcon({ isUser, avatar }: { isUser: boolean; avatar: Avatar }) {
  let icon: React.ReactNode;
  const className = 'h-4 w-4 text-muted-foreground';
  if (isUser) {
    icon = <User className={className} />;
  } else if (avatar.name?.toLowerCase().startsWith('gpt-')) {
    icon = <OpenAI className={className} />;
  } else {
    icon = <Bot className={className} />;
  }

  return <AvatarView avatar={avatar} icon={icon} className={className} />;
}

enum DisplayMessageState {
  Markdown,
  Text,
  Pending,
  Streaming,
  Edit,
  Asset,
}

type MessageComponentProps = {
  message: Message;
  index: number;
  avatars: AvatarRef[];
  disabled?: boolean;
  edit: boolean;
  onStartEdit: (messageId: string, index: number) => void;
  onResendMessage: () => void;
  onDeleteMessage: () => void;
  onDeleteAssets: () => void;
  onChangeContent: (content: string, submit: boolean) => void;
};

function MessageComponent({
  message,
  index,
  avatars,
  disabled = false,
  edit,
  onStartEdit,
  onResendMessage,
  onDeleteMessage,
  onChangeContent,
  onDeleteAssets,
}: MessageComponentProps) {
  const { t } = useTranslation();
  const [ref, isHover] = useHover();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [editValue, setEditValue] = useState<string | undefined>(undefined);
  const [current, setCurrent] = useState(0);

  const author = getMessageContentAuthorAsString(message, current);
  const avatar =
    avatars.find(
      (a) =>
        author.metadata?.assistantId === a.ref ||
        author.metadata?.modelId === a.ref ||
        a.name === author.name,
    ) || ({ name: author.name } as Avatar);
  const isUser = author.role === 'user';

  const content = getMessageContentHistoryAsString(
    message,
    current,
    !isUser || editValue !== undefined,
  );
  const { Content, MarkDownContext } = useMarkdownProcessor(content || '');

  const handleEdit = useCallback(() => {
    const raw = getMessageContentHistoryAsString(message, current, true);
    setEditValue(raw);
    onStartEdit(message.id, index);
  }, [message, current, onStartEdit, index]);

  useEffect(() => {
    if (edit && editValue === undefined) {
      handleEdit();
    }
  }, [edit, handleEdit, editValue]);

  const handleSave = () => {
    const newContent = inputRef.current?.value;
    if (newContent && content !== newContent) {
      onChangeContent(newContent, isUser);
    }
    setEditValue(undefined);
  };

  const handleCancelEdit = () => {
    setEditValue(undefined);
  };

  let state = DisplayMessageState.Markdown;
  if (message.assets) {
    state = DisplayMessageState.Asset;
  } else if (editValue !== undefined) {
    state = DisplayMessageState.Edit;
  } else if (isUser) {
    state = DisplayMessageState.Text;
  } else if (message.status === MessageStatus.Pending || content === '...') {
    state = DisplayMessageState.Pending;
  } else if (message.status === MessageStatus.Stream) {
    state = DisplayMessageState.Streaming;
  }

  const memoizedContent = useMemo(() => ({ content }), [content]);
  return (
    <MarkDownContext.Provider value={memoizedContent}>
      <div
        ref={disabled ? undefined : ref}
        className={`group relative w-full hover:dark:bg-secondary/20 ${isUser ? '' : ''}`}
      >
        <div className="m-auto flex w-full gap-4 font-sans text-sm md:max-w-2xl md:gap-6 lg:max-w-xl lg:px-0 xl:max-w-3xl">
          <div className="m-auto flex w-full flex-row gap-4 p-4 md:max-w-2xl md:gap-6 md:py-6 lg:max-w-xl lg:px-0 xl:max-w-3xl">
            <div className="flex flex-col items-end">
              <div className="text-opacity-100r flex h-7 items-center justify-center rounded-md p-1 text-white">
                <AvatarIcon isUser={isUser} avatar={avatar} />
              </div>
            </div>
            <div className="flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
              <div className="flex flex-grow flex-col">
                <div className="flex min-h-20 flex-col items-start whitespace-pre-wrap break-words">
                  <div className="w-full break-words">
                    <p className="py-1 font-bold capitalize">{avatar.name}</p>
                    {state === DisplayMessageState.Asset && (
                      <div className="flex w-full select-auto flex-row items-center px-0 py-2">
                        <File className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        <span>{t('Document added')}</span>
                      </div>
                    )}
                    {state === DisplayMessageState.Pending && (
                      <div className="px-4 py-2">
                        <MoreHorizontal className="h-4 w-4 animate-pulse" />
                      </div>
                    )}
                    {(state === DisplayMessageState.Markdown ||
                      state === DisplayMessageState.Streaming) && (
                      <div className="w-full select-auto px-0 py-2">{Content}</div>
                    )}
                    {state === DisplayMessageState.Text && (
                      <div className="w-full select-auto px-0 py-2">{content}</div>
                    )}
                    {state === DisplayMessageState.Edit && (
                      <Textarea
                        autoFocus
                        ref={inputRef}
                        className="-mx-3 mb-4 mt-0 min-h-[40px] w-full resize-none text-sm"
                        value={editValue !== undefined ? editValue : content}
                        onChange={(e) => {
                          setEditValue(e.target.value);
                        }}
                      />
                    )}
                  </div>
                  {state === DisplayMessageState.Asset && isHover && (
                    <div className="left-34 absolute bottom-0 flex flex-row items-center">
                      <DeleteButton onDeleteMessage={onDeleteAssets} />
                    </div>
                  )}
                  {(state === DisplayMessageState.Markdown || state === DisplayMessageState.Text) &&
                    isHover && (
                      <div className="left-34 absolute bottom-0 flex flex-row items-center">
                        {message.contentHistory && message.contentHistory.length > 0 && (
                          <div className="flex flex-row items-center pt-0 text-xs">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={current === message.contentHistory?.length}
                              onClick={() => {
                                setCurrent(current + 1);
                              }}
                              className="h-5 w-5 p-1"
                            >
                              <ChevronLeft
                                className="h-4 w-4 text-muted-foreground"
                                strokeWidth={1.5}
                              />
                            </Button>
                            <span className="tabular-nums">
                              {' '}
                              {message.contentHistory.length - current + 1} /{' '}
                              {message.contentHistory.length + 1}{' '}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={current === 0}
                              onClick={() => {
                                setCurrent(current - 1);
                              }}
                              className="h-5 w-5 p-1"
                            >
                              <ChevronRight
                                className="h-4 w-4 text-muted-foreground"
                                strokeWidth={1.5}
                              />
                            </Button>
                          </div>
                        )}
                        {!isUser && (
                          <Button variant="ghost" size="sm" onClick={onResendMessage}>
                            <RotateCcw
                              className="h-4 w-4 text-muted-foreground"
                              strokeWidth={1.5}
                            />
                          </Button>
                        )}
                        {/* <ClipboardButton
                          copied={copied}
                          onCopyToClipboard={handleCopyToClipboard}
                        /> */}
                        <CopyToClipBoard title={t('Copy message to clipboard')} text={content} />
                        {message.status !== MessageStatus.Error && (
                          <Button variant="ghost" size="sm" onClick={handleEdit}>
                            <Pencil className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                          </Button>
                        )}
                        <DeleteButton onDeleteMessage={onDeleteMessage} />
                      </div>
                    )}
                  {state === DisplayMessageState.Edit && (
                    <div className="left-30 absolute -bottom-2 flex flex-row gap-2">
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!editValue}
                        className="my-2 h-[28px] py-2"
                      >
                        {isUser ? t('Save & submit') : t('Save')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="my-2 h-[28px] py-2"
                      >
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
    </MarkDownContext.Provider>
  );
}

export default MessageComponent;
