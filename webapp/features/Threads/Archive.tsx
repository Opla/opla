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

import { useMemo } from 'react';
import useTranslation from '@/hooks/useTranslation';
import { MenuAction } from '@/types/ui';
import { AvatarRef } from '@/types';
import ContentView from '@/components/common/ContentView';
import { useThreadStore } from '@/stores';
import { Button } from '../../components/ui/button';
import { ConversationList } from './Conversation';

function Archive({
  archiveId,
  rightToolbar,
  onSelectMenu,
}: {
  archiveId?: string;
  rightToolbar: React.ReactNode;
  onSelectMenu: (menu: MenuAction, data: string) => void;
}) {
  const { archives } = useThreadStore();
  const archive = archives.find((c) => c.id === archiveId);

  const { t } = useTranslation();

  const messages = useMemo(
    () => archive?.messages?.filter((m) => !(m.author.role === 'system')) || [],
    [archive?.messages],
  );
  const avatars = useMemo(
    () =>
      messages?.map(
        (msg) => ({ name: msg.author.name, ref: msg.author.name, url: 'none' }) as AvatarRef,
      ) ?? [],
    [messages],
  );

  return (
    <ContentView
      header={
        <span>
          {t('Archives')} / {archive?.name}
        </span>
      }
      toolbar={
        <div className="flex w-full flex-row items-center justify-end gap-4 text-xs">
          <Button
            variant="ghost"
            size="sm"
            disabled={!archiveId}
            onClick={() => onSelectMenu(MenuAction.UnarchiveConversation, archiveId as string)}
          >
            {t('Unarchive')}
          </Button>
          {rightToolbar}
        </div>
      }
    >
      {archive && (
        <ConversationList
          conversation={archive}
          scrollPosition={undefined}
          selectedMessageId={undefined}
          messages={messages}
          avatars={avatars}
          disabled
          onScrollPosition={() => {}}
          onResendMessage={() => {}}
          onDeleteMessage={() => {}}
          onDeleteAssets={() => {}}
          onChangeMessageContent={() => {}}
          onStartMessageEdit={() => {}}
          onCopyMessage={() => {}}
          onCancelSending={() => {}}
        />
      )}
    </ContentView>
  );
}

export default Archive;
