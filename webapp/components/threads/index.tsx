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

import { useContext } from 'react';
import { useRouter } from 'next/router';
import useBackend from '@/hooks/useBackendContext';
import { Conversation, PageSettings } from '@/types';
import { DefaultPageSettings } from '@/utils/constants';
import logger from '@/utils/logger';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import { getConversation, deleteConversation } from '@/utils/data/conversations';
import { ModalIds } from '@/modals';
import { ModalsContext } from '@/context/modals';
import { AppContext } from '@/context';
import { MenuAction, Page, ViewName } from '@/types/ui';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import Explorer from './Explorer';
import Settings from './Settings';
import Thread from './Thread';
import Archive from './Archive';

const getSelectedPage = (selectedThreadId?: string) =>
  `${Page.Threads}${selectedThreadId ? `/${selectedThreadId}` : ''}`;

type ThreadsProps = {
  selectedThreadId?: string;
  view?: ViewName;
};

export default function Threads({ selectedThreadId, view = ViewName.Recent }: ThreadsProps) {
  const router = useRouter();
  const {
    conversations,
    updateConversations,
    getConversationMessages,
    updateConversationMessages,
    archives,
    setArchives,
  } = useContext(AppContext);
  const { backendContext, setSettings } = useBackend();

  useShortcuts(ShortcutIds.DELETE_MESSAGE, (event) => {
    event.preventDefault();
    logger.info('delete Message');
  });
  useShortcuts(ShortcutIds.EDIT_MESSAGE, (event) => {
    event.preventDefault();
    logger.info('edit Message');
  });
  const { showModal } = useContext(ModalsContext);

  const defaultSettings = backendContext.config.settings;
  const selectedPage = getSelectedPage(selectedThreadId);
  const pageSettings =
    defaultSettings.pages?.[selectedPage] ||
    defaultSettings.pages?.[Page.Threads] ||
    DefaultPageSettings;

  const saveSettings = (partialSettings: Partial<PageSettings>) => {
    const { settings } = backendContext.config;
    logger.info('saveSettings', selectedPage, partialSettings, backendContext.config);
    if (settings.selectedPage) {
      const pages = settings.pages || {};
      const page = pages[selectedPage] || DefaultPageSettings;
      setSettings({
        ...settings,
        pages: { ...pages, [selectedPage]: { ...page, ...partialSettings } },
      });
    }
  };

  const handleResizeExplorer = (size: number) => {
    saveSettings({ explorerWidth: size });
  };

  const handleResizeSettings = (size: number) => {
    saveSettings({ settingsWidth: size });
  };

  const handleChangeDisplayExplorer = (value: boolean) => {
    saveSettings({ explorerHidden: !value });
  };

  const handleChangeDisplaySettings = (value: boolean) => {
    saveSettings({ settingsHidden: !value });
  };

  const handleDelete = (action: string, data: any) => {
    const conversation = data?.item as Conversation;
    logger.info(`delete ${action} ${data}`);
    if (conversation) {
      if (action === 'Delete') {
        const updatedConversations = deleteConversation(conversation.id, conversations);
        updateConversations(updatedConversations);
        if (selectedThreadId && selectedThreadId === conversation.id) {
          router.replace(Page.Threads);
        }
      }
    }
  };

  const handleShouldDelete = (data: string) => {
    logger.info(`to delete ${data}`);
    const conversation = getConversation(data, conversations) as Conversation;
    showModal(ModalIds.DeleteItem, { item: conversation, onAction: handleDelete });
  };

  const handleSelectMenu = (menu: MenuAction, data: string) => {
    logger.info('onSelectMenu', menu);
    if (menu === MenuAction.DeleteConversation) {
      handleShouldDelete(data);
    } else if (menu === MenuAction.ArchiveConversation) {
      const conversationToArchive = getConversation(data, conversations) as Conversation;
      const messages = getConversationMessages(conversationToArchive.id);
      const updatedConversations = deleteConversation(conversationToArchive.id, conversations);
      updateConversations(updatedConversations);
      setArchives([...archives, { ...conversationToArchive, messages }]);
    } else if (menu === MenuAction.UnarchiveConversation) {
      const { messages, ...archive } = getConversation(data, archives) as Conversation;
      const updatedArchives = deleteConversation(archive.id, archives);
      setArchives(updatedArchives);
      updateConversations([...conversations, archive as Conversation]);
      updateConversationMessages(archive.id, messages || []);
    } else if (menu === MenuAction.ChangeView) {
      if (data === ViewName.Recent) {
        router.replace(Page.Threads);
      } else {
        router.replace(Page.Archives);
      }
    }
  };

  const setThreads = (threads: Conversation[]) => {
    if (view === ViewName.Recent) {
      updateConversations(threads);
    } else {
      setArchives(threads);
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel
        minSize={10}
        defaultSize={pageSettings.explorerWidth}
        onResize={handleResizeExplorer}
        className={!pageSettings.explorerHidden ? '' : 'hidden'}
      >
        <Explorer
          view={view}
          threads={view === ViewName.Recent ? conversations : archives}
          setThreads={setThreads}
          onSelectMenu={handleSelectMenu}
          onShouldDelete={handleShouldDelete}
          selectedThreadId={selectedThreadId}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        {view !== ViewName.Archives && (
          <Thread
            conversationId={selectedThreadId}
            displayExplorer={!pageSettings.explorerHidden}
            displaySettings={!pageSettings.settingsHidden}
            onChangeDisplayExplorer={handleChangeDisplayExplorer}
            onChangeDisplaySettings={handleChangeDisplaySettings}
            onSelectMenu={handleSelectMenu}
          />
        )}
        {view === ViewName.Archives && (
          <Archive archiveId={selectedThreadId} onSelectMenu={handleSelectMenu} />
        )}
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        minSize={20}
        defaultSize={20}
        onResize={handleResizeSettings}
        className={!pageSettings.settingsHidden && view === ViewName.Recent ? '' : 'hidden'}
      >
        <Settings conversationId={selectedThreadId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
