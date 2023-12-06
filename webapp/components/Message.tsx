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

import { Message } from '@/types';
import { BiBot, BiUser } from 'react-icons/bi';
import { TbCursorText } from 'react-icons/tb';

function MessageComponent({ message }: { message: Message }) {
  const { author, content: text } = message;

  const isUser = author.role === 'user';

  return (
    <div className={`group w-full text-gray-800 dark:text-gray-100 ${isUser ? '' : ''}`}>
      <div className="m-auto flex w-full gap-4 text-base md:max-w-2xl md:gap-6 lg:max-w-xl lg:px-0 xl:max-w-3xl">
        <div className="m-auto flex w-full flex-row gap-4 p-4 md:max-w-2xl md:gap-6 md:py-6 lg:max-w-xl lg:px-0 xl:max-w-3xl">
          <div className="flex w-8 flex-col items-end">
            <div className="text-opacity-100r flex h-7 w-7 items-center justify-center rounded-md p-1 text-white">
              {isUser ? (
                <BiUser className="h-4 w-4 text-white" />
              ) : (
                <BiBot className="h-4 w-4 text-white" />
              )}
            </div>
          </div>
          <div className="flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
            <div className="flex flex-grow flex-col gap-3">
              <div className="min-h-20 flex flex-col items-start gap-4 whitespace-pre-wrap break-words">
                <div className="markdown prose dark:prose-invert dark w-full break-words">
                  <p className="font-bold capitalize">{author.name}</p>
                  {!isUser && text === null ? (
                    <TbCursorText className="h-6 w-6 animate-pulse" />
                  ) : (
                    <p className="select-auto">{text as string}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageComponent;
