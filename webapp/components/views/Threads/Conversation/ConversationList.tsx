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

import { ArrowDown } from 'lucide-react';
import useScroll, { KeyedScrollPosition } from '@/hooks/useScroll';
import { Message } from '@/types';
import logger from '@/utils/logger';
import MessageView from '../Message';
import { Button } from '../../../ui/button';

type ConversationListProps = {
  conversationId: string;
  scrollPosition: number;
  messages: Message[];
  onScrollPosition: (props: KeyedScrollPosition) => void;
  onResendMessage: (m: Message) => void;
  onDeleteMessage: (m: Message) => void;
  onDeleteAssets: (m: Message) => void;
  onChangeMessageContent: (m: Message, newContent: string, submit: boolean) => void;
};

function ConversationList({
  conversationId,
  scrollPosition,
  messages,
  onScrollPosition,
  onResendMessage,
  onDeleteMessage,
  onDeleteAssets,
  onChangeMessageContent,
}: ConversationListProps) {
  const handleUpdatePosition = (props: KeyedScrollPosition) => {
    logger.info('updated newPosition', props);
    onScrollPosition(props);
  };

  const position = { x: scrollPosition === -1 ? -1 : 0, y: scrollPosition };
  const [ref, scrollTo] = useScroll(conversationId, position, handleUpdatePosition);

  return (
    <div className="flex grow flex-col overflow-hidden">
      <div ref={ref} className="overflow-y-auto">
        <div>
          {messages.map((m) => (
            <MessageView
              key={m.id}
              message={m}
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
            />
          ))}
        </div>
      </div>

      <div className="z-100 relative w-full">
        {scrollPosition < 99 && scrollPosition > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-4 right-8"
            onClick={() => scrollTo({ x: 0, y: 100 })}
          >
            <ArrowDown />
          </Button>
        )}
      </div>
    </div>
  );
}

export default ConversationList;
