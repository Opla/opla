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
  const { conversations, setConversations } = useContext(AppContext);
  const { archives, setArchives } = useContext(AppContext);
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

  const onResizeExplorer = (size: number) => {
    saveSettings({ explorerWidth: size });
  };

  const onResizeSettings = (size: number) => {
    saveSettings({ settingsWidth: size });
  };

  const onChangeDisplayExplorer = (value: boolean) => {
    saveSettings({ explorerHidden: !value });
  };

  const onChangeDisplaySettings = (value: boolean) => {
    saveSettings({ settingsHidden: !value });
  };

  const onDelete = (action: string, data: any) => {
    const conversation = data?.item as Conversation;
    logger.info(`delete ${action} ${data}`);
    if (conversation) {
      if (action === 'Delete') {
        const updatedConversations = deleteConversation(conversation.id, conversations);
        setConversations(updatedConversations);
        if (selectedThreadId && selectedThreadId === conversation.id) {
          router.replace(Page.Threads);
        }
      }
    }
  };

  const onShouldDelete = (data: string) => {
    logger.info(`to delete ${data}`);
    const conversation = getConversation(data, conversations) as Conversation;
    showModal(ModalIds.DeleteItem, { item: conversation, onAction: onDelete });
  };

  const onSelectMenu = (menu: MenuAction, data: string) => {
    logger.info('onSelectMenu', menu);
    if (menu === MenuAction.DeleteConversation) {
      onShouldDelete(data);
    } else if (menu === MenuAction.ArchiveConversation) {
      const conversation = getConversation(data, conversations) as Conversation;
      const updatedConversations = deleteConversation(conversation.id, conversations);
      setConversations(updatedConversations);
      setArchives([...archives, conversation]);
    } else if (menu === MenuAction.UnarchiveConversation) {
      const conversation = getConversation(data, archives) as Conversation;
      const updatedArchives = deleteConversation(conversation.id, archives);
      setArchives(updatedArchives);
      setConversations([...conversations, conversation]);
    } else if (menu === MenuAction.ChangeView) {
      if (data === ViewName.Recent) {
        router.replace(Page.Threads);
      } else {
        router.replace(Page.Archives);
      }
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel
        minSize={10}
        defaultSize={pageSettings.explorerWidth}
        onResize={onResizeExplorer}
        className={!pageSettings.explorerHidden ? '' : 'hidden'}
      >
        <Explorer
          view={view}
          threads={view === ViewName.Recent ? conversations : archives}
          setThreads={view === ViewName.Recent ? setConversations : setArchives}
          onSelectMenu={onSelectMenu}
          onShouldDelete={onShouldDelete}
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
            onChangeDisplayExplorer={onChangeDisplayExplorer}
            onChangeDisplaySettings={onChangeDisplaySettings}
            onSelectMenu={onSelectMenu}
          />
        )}
        {view === ViewName.Archives && (
          <Archive archiveId={selectedThreadId} onSelectMenu={onSelectMenu} />
        )}
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        minSize={20}
        defaultSize={20}
        onResize={onResizeSettings}
        className={!pageSettings.settingsHidden && view === ViewName.Recent ? '' : 'hidden'}
      >
        <Settings conversationId={selectedThreadId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
