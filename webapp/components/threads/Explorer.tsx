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

import { useContext, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Archive,
  Check,
  FolderClock,
  FolderInput,
  Import,
  MoreHorizontal,
  SquarePen,
} from 'lucide-react';
// import { AppContext } from '@/context';
import { Conversation, Ui } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import {
  getConversation,
  mergeConversations,
  updateConversation,
} from '@/utils/data/conversations';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import { openFileDialog, readTextFile, saveFileDialog, writeTextFile } from '@/utils/backend/tauri';
import {
  importChatGPTConversation,
  validateChaGPTConversations,
} from '@/utils/conversations/openai';
import { getConversationTitle, validateConversations } from '@/utils/conversations';
import { MenuAction, ViewName } from '@/types/ui';
import { AppContext } from '@/context';
import { toast } from '../ui/Toast';
import EditableItem from '../common/EditableItem';
import { ContextMenu, ContextMenuTrigger } from '../ui/context-menu';
import ContextMenuList from '../ui/ContextMenu/ContextMenuList';
import Opla from '../icons/Opla';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { ShortcutBadge } from '../common/ShortCut';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';

type ExplorerProps = {
  view: Ui.ViewName;
  selectedThreadId?: string;
  threads: Conversation[];
  setThreads: (conversations: Conversation[]) => void;
  onShouldDelete: (id: string) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
};

export default function Explorer({
  view,
  selectedThreadId,
  threads,
  setThreads,
  onShouldDelete,
  onSelectMenu,
}: ExplorerProps) {
  const router = useRouter();
  const { getConversationMessages } = useContext(AppContext);

  const [editableConversation, setEditableConversation] = useState<string | undefined>(undefined);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleRename = (data: string) => {
    logger.info(`rename ${data}`);
    setEditableConversation(data);
  };

  const handleChangeConversationName = (value: string, id: string) => {
    const conversation = getConversation(id, threads) as Conversation;
    if (conversation) {
      conversation.name = value;
    }
    const updatedConversations = updateConversation(conversation, threads, true);
    setThreads(updatedConversations);
    logger.info(`onChangeConversationName ${editableConversation} ${value} ${id}`);
  };

  const handleImportConversations = async () => {
    logger.info('onImportConversations');
    try {
      const filePath = await openFileDialog(false, [
        { name: 'conversations', extensions: ['json'] },
      ]);
      if (!filePath) {
        return;
      }
      const content = await readTextFile(filePath as string, false);
      const importedConversations = JSON.parse(content);
      const validate = validateConversations(importedConversations);
      if (validate.success) {
        const mergedConversations = mergeConversations(threads, importedConversations);
        setThreads(mergedConversations);
        toast.message(t('Imported and merged'));
        return;
      }

      const validateGPT = validateChaGPTConversations(importedConversations);
      if (!validateGPT.success) {
        toast.error(`${t('Unable to import')} : ${validateGPT.error}`);
        return;
      }
      const newConversations = importChatGPTConversation(validateGPT.data);
      const mergedConversations = mergeConversations(threads, newConversations);
      setThreads(mergedConversations);
      toast.message(t('Imported and merged'));
    } catch (error) {
      logger.error(error);
      toast.error(`${t('Unable to import')} : ${error}`);
    }
  };

  const handleExportConversations = async () => {
    logger.info('onExportConversations');
    try {
      const filePath = await saveFileDialog([{ name: 'conversations', extensions: ['json'] }]);
      if (!filePath) {
        return;
      }
      const exportedConversations = threads.map((c) => {
        let { messages } = c;
        if (!messages) {
          messages = getConversationMessages(c.id);
          return { c, messages };
        }
        return c;
      });
      const content = JSON.stringify(exportedConversations);
      await writeTextFile(filePath as string, content, false);
    } catch (error) {
      logger.error(error);
      toast.error(`Unable to export : ${error}`);
    }
  };

  const handleSelectThread = (id: string) => {
    logger.info(`onSelectThread ${id}`);
    const route = view === ViewName.Archives ? Ui.Page.Archives : Ui.Page.Threads;
    router.push(`${route}/${id}`); // , undefined, { shallow: true });
  };

  useShortcuts(ShortcutIds.NEW_CONVERSATION, (event) => {
    if (selectedThreadId) {
      event.preventDefault();
      logger.info('shortcut new Conversation');
      router.push(Ui.Page.Threads);
      toast.message('New Conversation');
    }
  });
  useShortcuts(ShortcutIds.DELETE_CONVERSATION, (event) => {
    if (selectedThreadId) {
      event.preventDefault();
      logger.info('shortcut delete Conversation');
      onShouldDelete(selectedThreadId);
    }
  });
  useShortcuts(ShortcutIds.RENAME_CONVERSATION, (event) => {
    if (selectedThreadId) {
      event.preventDefault();
      logger.info('shortcut rename Conversation');
      handleRename(selectedThreadId);
    }
  });

  const menu: Ui.MenuItem[] = [
    {
      label: t('Rename'),
      onSelect: handleRename,
    },
    {
      label: t('Delete'),
      onSelect: onShouldDelete,
    },
  ];

  return (
    <div className="scrollbar-trigger flex h-full bg-neutral-100 dark:bg-neutral-800/70">
      <nav className="flex h-full w-full flex-col">
        <div className="flex w-full items-center dark:bg-neutral-800">
          <div className="flex grow items-center px-2 py-4">
            <Opla className="mr-2 h-6 w-6" />
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              {t('Threads')}
            </p>
          </div>
          {selectedThreadId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  disabled={!selectedThreadId}
                  className="flex flex-shrink-0 cursor-pointer items-center p-1 text-sm text-neutral-400 transition-colors duration-200 hover:bg-neutral-500/10 hover:text-white dark:border-white/20 dark:text-neutral-400 hover:dark:text-white"
                >
                  <Link href={Ui.Page.Threads}>
                    <SquarePen className="h-5 w-5" strokeWidth={1.5} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={12} className="mt-1">
                <div className="flex w-full flex-row gap-2">
                  <p>{t('New conversation')}</p>
                  <ShortcutBadge command={ShortcutIds.NEW_CONVERSATION} />
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-full">
              <DropdownMenuLabel>{t('Views')}</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="flex w-full items-center justify-between"
                  onSelect={() => {
                    onSelectMenu(MenuAction.ChangeView, ViewName.Recent);
                  }}
                >
                  <div className="flex flex-1 items-center capitalize">
                    <FolderClock className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {t(ViewName.Recent)}
                  </div>
                  {view === ViewName.Recent && <Check className="h-4 w-4" strokeWidth={1.5} />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex w-full items-center justify-between"
                  onSelect={() => {
                    onSelectMenu(MenuAction.ChangeView, ViewName.Archives);
                  }}
                >
                  <div className="flex flex-1 items-center capitalize">
                    <Archive className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {t(ViewName.Archives)}
                  </div>
                  {view === ViewName.Archives && <Check className="h-4 w-4" strokeWidth={1.5} />}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('Tools')}</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={handleImportConversations}>
                  <Import className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {t('Import')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExportConversations}>
                  <FolderInput className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {t('Export')}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 flex-col space-y-1 overflow-y-auto overflow-x-hidden p-1 dark:border-white/20">
          <div className="flex flex-col gap-2 pb-2 text-sm dark:text-neutral-100">
            <div className="group flex flex-col gap-3 break-all rounded-md px-1 py-3">
              <div className="p1 text-ellipsis break-all text-neutral-600">{t(view)}</div>
              <ul className="p1 flex flex-1 flex-col">
                {threads
                  .sort((c1, c2) => c2.updatedAt - c1.updatedAt || c2.createdAt - c1.createdAt)
                  .map((conversation) => (
                    <li
                      key={conversation.id}
                      className={`${
                        conversation.temp || selectedThreadId === conversation.id
                          ? 'text-black dark:text-white'
                          : 'text-neutral-400 dark:text-neutral-400'
                      } rounded-md px-2 py-2 transition-colors duration-200 hover:bg-neutral-500/10`}
                    >
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <div
                            aria-label="Select a conversation"
                            role="button"
                            onKeyDown={() => {}}
                            onClick={(e) => {
                              e.preventDefault();
                              handleSelectThread(conversation.id);
                            }}
                            className="flex cursor-pointer flex-row items-center"
                            tabIndex={0}
                          >
                            <EditableItem
                              id={conversation.id}
                              title={getConversationTitle(conversation)}
                              editable={!conversation.temp && conversation.id === selectedThreadId}
                              className="line-clamp-1 h-auto w-full flex-1 overflow-hidden text-ellipsis break-all px-3 py-1"
                              onChange={handleChangeConversationName}
                            />
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuList data={conversation.id} menu={menu} />
                      </ContextMenu>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
