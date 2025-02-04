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

import { MoreHorizontal, File, TriangleAlert } from 'lucide-react';
import {
  getMessageContent,
  getMessageContentAuthorAsString,
  getMessageContentHistoryAsString,
} from '@/utils/data/messages';
import useHover from '@/hooks/useHover';
import useMarkdownProcessor from '@/hooks/useMarkdownProcessor/index';
import { Asset, Avatar, AvatarRef, ContentFull, MessageImpl, MessageStatus } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { getFilename } from '@/utils/misc';
import { cn } from '@/lib/utils';
import { Textarea } from '../../../../components/ui/textarea';
import AvatarIcon from './AvatarIcon';
import { DisplayMessageState } from './types';
import Actions from './Actions';

type MessageComponentProps = {
  message: MessageImpl;
  asset?: Asset;
  index: number;
  avatars: AvatarRef[];
  disabled?: boolean;
  edit: boolean;
  onStartEdit: (messageId: string, index: number) => void;
  onCancelMessageEdit: () => void;
  onResendMessage: () => void;
  onDeleteMessage: () => void;
  onDeleteAssets: () => void;
  onChangeContent: (content: string, submit: boolean) => void;
  onCopyMessage: (messageId: string, state: boolean) => void;
  onCancelSending: () => void;
};

function MessageComponent({
  message,
  asset,
  index,
  avatars,
  disabled = false,
  edit,
  onStartEdit,
  onCancelMessageEdit,
  onResendMessage,
  onDeleteMessage,
  onChangeContent,
  onDeleteAssets,
  onCopyMessage,
  onCancelSending,
}: MessageComponentProps) {
  const { t } = useTranslation();
  const [ref, isHover] = useHover();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
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

  const { cancelled, error } = (getMessageContent(message, current) || {}) as ContentFull;

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
    onCancelMessageEdit();
  };

  const handleCancelEdit = () => {
    setEditValue(undefined);
    onCancelMessageEdit();
  };

  let state = DisplayMessageState.Markdown;
  if (message.assets) {
    state = DisplayMessageState.FileAsset;
  } else if (editValue !== undefined) {
    state = DisplayMessageState.Edit;
  } else if (isUser) {
    state = DisplayMessageState.Text;
  } else if (author.role === 'note') {
    state = DisplayMessageState.Note;
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
        className={`group dark:hover:bg-secondary/20 relative w-full ${isUser ? '' : ''}`}
      >
        <div className="m-auto flex w-full gap-4 font-sans text-sm md:max-w-2xl md:gap-6 lg:max-w-xl lg:px-0 xl:max-w-3xl">
          <div className="m-auto flex w-full flex-row gap-4 p-4 md:max-w-2xl md:gap-6 md:py-6 lg:max-w-xl lg:px-0 xl:max-w-3xl">
            <div className="flex flex-col items-end">
              <div className="text-opacity-100r flex h-7 items-center justify-center rounded-md p-1 text-white">
                <AvatarIcon isUser={isUser} avatar={avatar} />
              </div>
            </div>
            <div className="flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
              <div className="flex grow flex-col">
                <div className="flex flex-col items-start break-words whitespace-pre-wrap">
                  <div className="w-full break-words">
                    {state !== DisplayMessageState.Note && (
                      <p className="flex items-center py-1 font-bold capitalize">
                        {avatar.name}{' '}
                        {cancelled && (
                          <>
                            <TriangleAlert className="text-muted-foreground ml-2 h-4 w-4" />
                            <span className="text-muted-foreground ml-1 font-thin">cancelled</span>
                          </>
                        )}
                        {(error || (!cancelled && message.status === MessageStatus.Error)) && (
                          <>
                            <TriangleAlert className="text-error ml-2 h-4 w-4" />
                            <span className="text-error ml-1 font-thin">{error}</span>
                          </>
                        )}
                      </p>
                    )}
                    {state === DisplayMessageState.FileAsset && (
                      <div className="pointer-events-auto flex w-full cursor-text flex-row items-center px-0 py-2 select-text">
                        <File className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        <span>
                          {t('Document added')}:{' '}
                          {asset?.type === 'file' ? getFilename(asset?.file) : t('Not found')}
                        </span>
                      </div>
                    )}
                    {state === DisplayMessageState.Pending && (
                      <div className="px-4 py-2">
                        <MoreHorizontal className="h-4 w-4 animate-pulse" />
                      </div>
                    )}
                    {(state === DisplayMessageState.Markdown ||
                      state === DisplayMessageState.Note ||
                      state === DisplayMessageState.Streaming) && (
                      <div
                        ref={contentRef}
                        className={cn(
                          'pointer-events-auto w-full cursor-text px-0 py-2 select-text',
                          state !== DisplayMessageState.Note ? '' : 'text-muted-foreground',
                        )}
                      >
                        {Content}
                      </div>
                    )}
                    {state === DisplayMessageState.Text && (
                      <div className="pointer-events-auto w-full cursor-text px-0 py-2 select-text">
                        {content}
                      </div>
                    )}
                    {state === DisplayMessageState.Edit && (
                      <div className="mb-4 -ml-3 p-2">
                        <Textarea
                          autoresize
                          autoFocus
                          tabIndex={0}
                          ref={inputRef}
                          autoComplete="off"
                          autoCorrect="off"
                          className="max-h-[600px] min-h-[36px] w-full text-sm"
                          value={editValue !== undefined ? editValue : content}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                          }}
                          maxRows={30}
                        />
                      </div>
                    )}
                  </div>
                  <Actions
                    state={state}
                    message={message}
                    content={content}
                    contentRef={contentRef}
                    disabled={!editValue}
                    isUser={isUser}
                    isHover={isHover}
                    current={current}
                    setCurrent={setCurrent}
                    onEdit={handleEdit}
                    onCancelEdit={handleCancelEdit}
                    onResendMessage={onResendMessage}
                    onDeleteMessage={onDeleteMessage}
                    onDeleteAssets={onDeleteAssets}
                    onSave={handleSave}
                    onCopyMessage={onCopyMessage}
                    onCancelSending={onCancelSending}
                  />
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
