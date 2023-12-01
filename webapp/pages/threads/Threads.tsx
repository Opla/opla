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

import Thread from '@/components/Thread';
import Explorer from '@/components/Explorer';

export default function Threads({ selectedConversationId }: { selectedConversationId?: string }) {
  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      <div className="flex w-[260px] flex-col">
        <div className="flex h-full min-h-0 flex-col ">
          <Explorer selectedConversationId={selectedConversationId} />
        </div>
      </div>
      <Thread conversationId={selectedConversationId} />
    </div>
  );
}
