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

// import { useState } from 'react';
import useBackend from '@/hooks/useBackendContext';
import { PageSettings } from '@/types';
import { DefaultPageSettings } from '@/utils/constants';
import logger from '@/utils/logger';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import Explorer from './Explorer';
import Settings from './Settings';
import Thread from './Thread';

const getSelectedPage = (selectedConversationId?: string) =>
  `/threads${selectedConversationId ? `/${selectedConversationId}` : ''}`;

export default function Threads({ selectedConversationId }: { selectedConversationId?: string }) {
  const { backendContext, setSettings } = useBackend();
  const defaultSettings = backendContext.config.settings;
  const selectedPage = getSelectedPage(selectedConversationId);
  const pageSettings =
    defaultSettings.pages?.[selectedPage] ||
    defaultSettings.pages?.['/threads'] ||
    DefaultPageSettings;
  // logger.info('page', selectedPage, pageSettings, defaultSettings);

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

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel
        minSize={10}
        defaultSize={pageSettings.explorerWidth}
        onResize={onResizeExplorer}
      >
        <Explorer selectedConversationId={selectedConversationId} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <Thread
          conversationId={selectedConversationId}
          displaySettings={!pageSettings.settingsHidden}
          onChangeDisplaySettings={onChangeDisplaySettings}
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
