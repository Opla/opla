// Copyright 2024 Mik Bry
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

import { ChevronLeft, ChevronRight, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageImpl, MessageStatus } from '@/types';
import { shortcutAsText } from '@/utils/shortcuts';
import useTranslation from '@/hooks/useTranslation';
import CopyToClipBoard from '@/components/common/CopyToClipBoard';
import { RefObject } from 'react';
import { ShortcutIds } from '@/hooks/useShortcuts';
import { DisplayMessageState } from './types';

function DeleteButton({ onDeleteMessage }: { onDeleteMessage: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onDeleteMessage}>
      <Trash2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
    </Button>
  );
}

type ActionsProps = {
  state: DisplayMessageState;
  message: MessageImpl;
  content: string;
  contentRef: RefObject<HTMLDivElement>;
  disabled: boolean;
  isUser: boolean;
  isHover: boolean;
  current: number;
  setCurrent: (value: number) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onResendMessage: () => void;
  onDeleteMessage: () => void;
  onDeleteAssets: () => void;
  onSave: () => void;
  onCopyMessage: (messageId: string, state: boolean) => void;
  onCancelSending: () => void;
};

function Actions({
  state,
  message,
  content,
  contentRef,
  disabled,
  isUser,
  isHover,
  current,
  setCurrent,
  onEdit,
  onCancelEdit,
  onResendMessage,
  onDeleteMessage,
  onDeleteAssets,
  onSave,
  onCopyMessage,
  onCancelSending,
}: ActionsProps) {
  const { t } = useTranslation();
  return (
    <>
      {state === DisplayMessageState.FileAsset && isHover && (
        <div className="left-34 absolute bottom-0 flex flex-row items-center">
          <DeleteButton onDeleteMessage={onDeleteAssets} />
        </div>
      )}
      {(state === DisplayMessageState.Pending || state === DisplayMessageState.Streaming) &&
        isHover && (
          <div className="left-34 absolute bottom-0 flex flex-row items-center">
            <Button variant="ghost" size="sm" onClick={onCancelSending}>
              <X className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </Button>
          </div>
        )}
      {(state === DisplayMessageState.Markdown ||
        state === DisplayMessageState.Note ||
        state === DisplayMessageState.Text) &&
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
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </Button>
              </div>
            )}
            {!(isUser || state === DisplayMessageState.Note) && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('Resend message')}
                title={`${t('Resend message')}  ${message.last ? shortcutAsText(ShortcutIds.RESEND_MESSAGE) : ''} `}
                onClick={onResendMessage}
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </Button>
            )}
            <CopyToClipBoard
              copied={message.copied}
              title={`${t('Copy message to clipboard')}  ${message.last && !isUser ? shortcutAsText(ShortcutIds.COPY_MESSAGE) : ''} `}
              message={t('Message copied to clipboard')}
              text={content}
              options={{ html: contentRef.current?.outerHTML ?? undefined }}
              onCopy={(copied) => onCopyMessage(message.id, copied)}
            />
            {message.status !== MessageStatus.Error && (
              <Button
                variant="ghost"
                aria-label={t('Edit message')}
                title={`${t('Edit message')}  ${message.last && isUser ? shortcutAsText(ShortcutIds.EDIT_MESSAGE) : ''} `}
                size="sm"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </Button>
            )}
            <Button
              variant="ghost"
              aria-label={t('Delete message and siblings')}
              title={`${t('Delete message and siblings')}  ${message.last ? shortcutAsText(ShortcutIds.DELETE_MESSAGE) : ''} `}
              size="sm"
              onClick={onDeleteMessage}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </Button>
          </div>
        )}
      {state === DisplayMessageState.Edit && (
        <div className="left-30 absolute -bottom-2 flex flex-row gap-2">
          <Button size="sm" onClick={onSave} disabled={disabled} className="my-2 h-[28px] py-2">
            {isUser ? t('Save & submit') : t('Save')}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancelEdit} className="my-2 h-[28px] py-2">
            {t('Cancel')}
          </Button>
        </div>
      )}
    </>
  );
}

export default Actions;
