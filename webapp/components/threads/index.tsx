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
import useShortcuts from '@/hooks/useShortcuts';
import { getConversation, deleteConversation } from '@/utils/data/conversations';
import { ModalIds } from '@/modals';
import { ModalsContext } from '@/context/modals';
import { AppContext } from '@/context';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import Explorer from './Explorer';
import Settings from './Settings';
import Thread from './Thread';

const getSelectedPage = (selectedConversationId?: string) =>
  `/threads${selectedConversationId ? `/${selectedConversationId}` : ''}`;

export default function Threads({ selectedConversationId }: { selectedConversationId?: string }) {
  const router = useRouter();

  const { conversations, setConversations } = useContext(AppContext);
  const { backendContext, setSettings } = useBackend();

  useShortcuts('#delete-message', (event) => {
    event.preventDefault();
    logger.info('delete Message');
  });
  useShortcuts('#editMessage', (event) => {
    event.preventDefault();
    logger.info('edit Message');
  });
  const { showModal } = useContext(ModalsContext);

  const defaultSettings = backendContext.config.settings;
  const selectedPage = getSelectedPage(selectedConversationId);
  const pageSettings =
    defaultSettings.pages?.[selectedPage] ||
    defaultSettings.pages?.['/threads'] ||
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

  const onChangeDisplaySettings = (value: boolean) => {
    // setDisplaySettings(value);
    saveSettings({ settingsHidden: !value });
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

  const onShouldDelete = (data: string) => {
    logger.info(`to delete ${data}`);
    const conversation = getConversation(data, conversations) as Conversation;
    showModal(ModalIds.DeleteItem, { item: conversation, onAction: onDelete });
  };

  const onSelectMenu = (menu: string, data: string) => {
    logger.info('onSelectMenu', menu);
    if (menu === 'delete-conversation') {
      onShouldDelete(data);
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel
        minSize={10}
        defaultSize={pageSettings.explorerWidth}
        onResize={onResizeExplorer}
      >
        <Explorer onShouldDelete={onShouldDelete} selectedConversationId={selectedConversationId} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <Thread
          conversationId={selectedConversationId}
          displaySettings={!pageSettings.settingsHidden}
          onChangeDisplaySettings={onChangeDisplaySettings}
          onSelectMenu={onSelectMenu}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        minSize={20}
        defaultSize={20}
        onResize={onResizeSettings}
        className={!pageSettings.settingsHidden ? '' : 'hidden'}
      >
        <Settings conversationId={selectedConversationId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
