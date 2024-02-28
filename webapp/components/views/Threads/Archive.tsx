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

import { useContext, useMemo, useRef } from 'react';
import { AppContext } from '@/context';
import useTranslation from '@/hooks/useTranslation';
import { MenuAction } from '@/types/ui';
import MessageView from './Message';
import { ScrollArea } from '../../ui/scroll-area';
import { Button } from '../../ui/button';

function Archive({
  archiveId,
  onSelectMenu,
}: {
  archiveId?: string;
  onSelectMenu: (menu: MenuAction, data: string) => void;
}) {
  const { archives } = useContext(AppContext);
  const selectedArchive = archives.find((c) => c.id === archiveId);

  const { t } = useTranslation();

  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => selectedArchive?.messages?.filter((m) => !(m.author.role === 'system')) || [],
    [selectedArchive?.messages],
  );

  return (
    <div className="flex h-full flex-col dark:bg-neutral-800/30">
      <div className="grow-0">
        <div className="flex w-full flex-row items-center justify-end gap-4 bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
          <Button
            variant="ghost"
            size="sm"
            disabled={!archiveId}
            onClick={() => onSelectMenu(MenuAction.UnarchiveConversation, archiveId as string)}
          >
            {t('Unarchive')}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex h-full flex-col">
        {messages.map((msg) => (
          <MessageView
            key={msg.id}
            message={msg}
            disabled
            onResendMessage={() => {}}
            onDeleteMessage={() => {}}
            onDeleteAssets={() => {}}
            onChangeContent={() => {}}
          />
        ))}
        <div className="h-4 w-full" />
        <div ref={bottomOfChatRef} />
      </ScrollArea>
    </div>
  );
}

export default Archive;
