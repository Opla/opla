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

import { useMemo, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import useScroll, { KeyedScrollPosition } from '@/hooks/useScroll';
import { AvatarRef, Conversation, Message, MessageImpl } from '@/types';
// import logger from '@/utils/logger';
import { getConversationAssets } from '@/utils/data/conversations';
import { getMessageFirstAsset } from '@/utils/data/messages';
import { Button } from '../../../ui/button';
import MessageView from './MessageView';

type ConversationListProps = {
  conversation: Conversation;
  scrollPosition: number | undefined;
  messages: MessageImpl[];
  selectedMessageId: string | undefined;
  avatars: AvatarRef[];
  disabled?: boolean;
  onScrollPosition: (props: KeyedScrollPosition) => void;
  onResendMessage: (m: Message) => void;
  onDeleteMessage: (m: Message) => void;
  onDeleteAssets: (m: Message) => void;
  onChangeMessageContent: (m: Message, newContent: string, submit: boolean) => void;
  onStartMessageEdit: (messageId: string, index: number) => void;
  onCopyMessage: (messageId: string, state: boolean) => void;
  onCancelSending: (messageId: string) => void;
};

function ConversationList({
  conversation,
  scrollPosition,
  messages,
  selectedMessageId,
  avatars,
  disabled,
  onScrollPosition,
  onResendMessage,
  onDeleteMessage,
  onDeleteAssets,
  onChangeMessageContent,
  onStartMessageEdit,
  onCopyMessage,
  onCancelSending,
}: ConversationListProps) {
  const [edit, setEdit] = useState<boolean>(false);

  const handleStartMessageEdit = (messageId: string, index: number) => {
    setEdit(true);
    onStartMessageEdit(messageId, index);
  };

  const position = {
    x: scrollPosition === -1 ? -1 : 0,
    y: scrollPosition === undefined || scrollPosition === null ? -1 : scrollPosition,
  };
  const [ref, onScroll] = useScroll(conversation.id, position, onScrollPosition);
  const assets = useMemo(
    () => (conversation ? getConversationAssets(conversation) : []),
    [conversation],
  );

  return (
    <div className="flex grow flex-col overflow-hidden">
      <div ref={ref} className={edit ? 'h-full overflow-y-auto' : 'overflow-y-auto'}>
        <div>
          {messages.map((m, index) => (
            <MessageView
              key={m.id}
              index={index}
              edit={selectedMessageId === m.id}
              message={m}
              asset={getMessageFirstAsset(m, assets)}
              avatars={avatars}
              disabled={disabled}
              onStartEdit={handleStartMessageEdit}
              onCancelMessageEdit={() => setEdit(false)}
              onResendMessage={() => {
                onResendMessage(m);
              }}
              onDeleteMessage={() => {
                onDeleteMessage(m);
              }}
              onDeleteAssets={() => {
                onDeleteAssets(m);
              }}
              onChangeContent={(newContent, submit) => {
                onChangeMessageContent(m, newContent, submit);
              }}
              onCopyMessage={onCopyMessage}
              onCancelSending={() => {
                onCancelSending(m.id);
              }}
            />
          ))}
        </div>
      </div>

      <div className="z-100 relative w-full">
        {scrollPosition !== undefined && scrollPosition < 99 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-4 right-8"
            onClick={() => onScroll({ x: -1, y: 100 }) /* onScrollPosition({ key: conversation.id, position: { x: -1, y: 100 } }) */}
          >
            <ArrowDown />
          </Button>
        )}
      </div>
    </div>
  );
}

export default ConversationList;
