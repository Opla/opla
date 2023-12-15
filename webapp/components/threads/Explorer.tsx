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

import { useContext, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PiPlus } from 'react-icons/pi';
import { AppContext } from '@/context';
import { Conversation, MenuItem } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  getConversation,
  updateConversation,
  deleteConversation,
} from '@/utils/data/conversations';
import { ModalsContext } from '@/utils/modalsProvider';
import ContextMenu from '../common/ContextMenu';
import EditableItem from '../common/EditableItem';

export default function Explorer({ selectedConversationId }: { selectedConversationId?: string }) {
  const router = useRouter();

  const { conversations, setConversations } = useContext(AppContext);
  const [editableConversation, setEditableConversation] = useState<string | undefined>(undefined);
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);

  const onRename = (data: string) => {
    logger.info(`rename ${data}`);
    setEditableConversation(data);
  };

  const onDelete = (action: string, data: any) => {
    const conversation = data?.item as Conversation;
    logger.info(`delete ${action} ${data}`);
    if (conversation) {
      if (action === 'Delete') {
        const updatedConversations = deleteConversation(conversation.id, conversations);
        setConversations(updatedConversations);
        if (selectedConversationId && selectedConversationId === conversation.id) {
          router.replace('/threads');
        }
      }
    }
  };

  const onToDelete = (data: string) => {
    logger.info(`to delete ${data}`);
    const conversation = getConversation(data, conversations) as Conversation;
    showModal('deleteitem', { item: conversation, onAction: onDelete });
  };

  const onChangeConversationName = (value: string, id: string) => {
    const conversation = getConversation(id, conversations) as Conversation;
    if (conversation) {
      conversation.name = value;
    }
    const updatedConversations = updateConversation(conversation, conversations);
    setConversations(updatedConversations);
    logger.info(`onChangeConversationName ${editableConversation} ${value} ${id}`);
  };

  const menu: MenuItem[] = [
    {
      label: t('Rename'),
      onSelect: onRename,
    },
    {
      label: t('Delete'),
      onSelect: onToDelete,
    },
  ];

  return (
    <div className="scrollbar-trigger flex h-full bg-neutral-100 dark:bg-neutral-800/70">
      <nav className="flex h-full flex-col space-y-1 p-1">
        <Link
          href="/threads"
          className="m-2 mb-1 flex flex-shrink-0 cursor-pointer items-center gap-2 rounded-md border px-4 py-1 text-sm text-neutral-400 transition-colors duration-200 hover:bg-neutral-500/10 hover:text-white dark:border-white/20 dark:text-neutral-400 hover:dark:text-white"
        >
          <PiPlus className="h-4 w-4" />
          {t('New chat')}
        </Link>
        <div className="flex-1 flex-col overflow-y-auto overflow-x-hidden dark:border-white/20">
          <div className="flex flex-col gap-2 pb-2 text-sm dark:text-neutral-100">
            <div className="group relative flex flex-col gap-3 break-all rounded-md px-1 py-3">
              <div className="p1 text-ellipsis break-all text-neutral-600">{t('Recent')}</div>
              <li className="p1 flex flex-1 flex-col">
                {conversations.map((conversation) => (
                  <ul
                    key={conversation.id}
                    className={`${
                      selectedConversationId === conversation.id
                        ? 'text-black dark:text-white'
                        : 'text-neutral-400 dark:text-neutral-400'
                    } rounded-md px-2 py-2 transition-colors duration-200 hover:bg-neutral-500/10`}
                  >
                    <ContextMenu data={conversation.id} menu={menu}>
                      <Link
                        href={`/threads/${conversation.id}`}
                        className="flex cursor-pointer flex-row items-center"
                      >
                        <EditableItem
                          id={conversation.id}
                          title={conversation.name}
                          editable={conversation.id === selectedConversationId}
                          className="relative max-h-5 flex-1 overflow-hidden text-ellipsis break-all"
                          onChange={onChangeConversationName}
                        />
                      </Link>
                    </ContextMenu>
                  </ul>
                ))}
              </li>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
