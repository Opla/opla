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

import { useEffect, useRef } from 'react';
import useScroll, { KeyedScrollPosition } from '@/hooks/useScroll';
import { Message } from '@/types';
import logger from '@/utils/logger';
import MessageView from './Message';

type ConversationProps = {
  conversationId: string;
  scrollPosition: number;
  messages: Message[];
  onScrollPosition: (props: KeyedScrollPosition) => void;
  handleResendMessage: (m: Message) => void;
  handleShouldDeleteMessage: (m: Message) => void;
  handleChangeMessageContent: (m: Message, newContent: string, submit: boolean) => void;
};

function Conversation({
  conversationId,
  scrollPosition,
  messages,
  onScrollPosition,
  handleResendMessage,
  handleShouldDeleteMessage,
  handleChangeMessageContent,
}: ConversationProps) {
  const bottomOfChatRef = useRef<HTMLDivElement>(null);
  //  const [updatedScrollPosition, setUpdatedScrollPosition] = useState(scrollPosition);

  const handleUpdatePosition = (props: KeyedScrollPosition) => {
    // if (position.y === newPosition.y) return;
    logger.info('updated newPosition', props);
    // onScrollPosition(newPosition.y);
    onScrollPosition(props);
  };

  // const ref = useRef<HTMLDivElement | undefined>(undefined);
  const [ref, scrollTo] = useScroll(
    conversationId,
    { x: scrollPosition === -1 ? -1 : 0, y: scrollPosition },
    handleUpdatePosition,
  );
  logger.info(`render Conversation ${messages.length}`, scrollPosition, handleUpdatePosition, ref);

  useEffect(() => {
    scrollTo({ x: 0, y: scrollPosition });
  }, [scrollPosition, scrollTo]);

  // useDebounceFunc<number>(onScrollPosition, updatedScrollPosition, 500);

  /* return (
    <ScrollArea viewPortRef={ref} className="flex h-full flex-col">
      {messages.map((m) => (
        <MessageView
          key={m.id}
          message={m}
          onResendMessage={() => {
            handleResendMessage(m);
          }}
          onDeleteMessage={() => {
            handleShouldDeleteMessage(m);
          }}
          onChangeContent={(newContent, submit) => {
            handleChangeMessageContent(m, newContent, submit);
          }}
        />
      ))}
      <div className="h-4 w-full" />
      <div ref={bottomOfChatRef} />
    </ScrollArea>
  ); */
  return (
    <div className="flex grow flex-col overflow-hidden">
      <div ref={ref} className="overflow-y-auto">
        {messages.map((m) => (
          <MessageView
            key={m.id}
            message={m}
            onResendMessage={() => {
              handleResendMessage(m);
            }}
            onDeleteMessage={() => {
              handleShouldDeleteMessage(m);
            }}
            onChangeContent={(newContent, submit) => {
              handleChangeMessageContent(m, newContent, submit);
            }}
          />
        ))}
      </div>

      <div className="h-4 w-full" />
      <div ref={bottomOfChatRef} />
    </div>
  );
}

export default Conversation;
