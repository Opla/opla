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

import { useContext } from 'react';
import { useRouter } from 'next/router';
import { useSearchParams } from 'next/navigation';
import useBackend from '@/hooks/useBackendContext';
import { Conversation, PageSettings } from '@/types';
import { DefaultPageSettings } from '@/utils/constants';
import logger from '@/utils/logger';
import { AppContext } from '@/context';
import { MenuAction, Page, ViewName } from '@/types/ui';
import { getAssistantId } from '@/utils/services';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../components/ui/resizable';
import Explorer from './Explorer';

const getSelectedPage = (selectedThreadId: string | undefined, view: ViewName) =>
  `${view === ViewName.Recent ? Page.Threads : Page.Archives}${selectedThreadId ? `/${selectedThreadId}` : ''}`;

type ThreadsProps = {
  selectedThreadId?: string;
  view?: ViewName;
  children?: React.ReactNode;
  onSelectMenu: (menu: MenuAction, data: string) => void;
  onShouldDelete: (id: string) => void;
  onResizeExplorer: (width: number) => void;
};

export default function Threads({
  selectedThreadId,
  view = ViewName.Recent,
  children,
  onSelectMenu,
  onShouldDelete,
  onResizeExplorer,
}: ThreadsProps) {
  const router = useRouter();
  const { id } = router.query;
  const { pathname } = router;

  const { conversations, updateConversations, archives, setArchives } = useContext(AppContext);
  const { config } = useBackend();

  const searchParams = useSearchParams();
  const selectedConversation = conversations.find((c) => c.id === selectedThreadId);
  const assistantId = searchParams?.get('assistant') || getAssistantId(selectedConversation);

  const selectedPage = getSelectedPage(selectedThreadId, view);

  if (id !== selectedThreadId) {
    logger.info('conflict in Threads', id, selectedThreadId);
    return null;
  }

  const setThreads = (threads: Conversation[]) => {
    if (view === ViewName.Recent) {
      updateConversations(threads);
    } else {
      setArchives(threads);
    }
  };

  const defaultSettings = config.settings;
  let pageSettings: PageSettings;

  if (pathname.startsWith(Page.Archives)) {
    pageSettings = defaultSettings.pages?.[pathname] || DefaultPageSettings;
  } else if (pathname === `${Page.Threads}/store`) {
    pageSettings = defaultSettings.pages?.[pathname] || DefaultPageSettings;
  } else {
    pageSettings =
      defaultSettings.pages?.[selectedPage] ||
      defaultSettings.pages?.[Page.Threads] ||
      DefaultPageSettings;
  }
  // logger.info('render Threads', selectedThreadId, view);
  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel
        id="explorer"
        minSize={14}
        maxSize={40}
        defaultSize={pageSettings.explorerWidth}
        onResize={onResizeExplorer}
        className={pageSettings.explorerHidden === true ? 'hidden' : ''}
      >
        <Explorer
          threads={conversations}
          archives={archives}
          setThreads={setThreads}
          onSelectMenu={onSelectMenu}
          onShouldDelete={onShouldDelete}
          selectedAssistantId={assistantId}
          selectedThreadId={selectedThreadId}
        />
      </ResizablePanel>
      <ResizableHandle />
      {children}
    </ResizablePanelGroup>
  );
}
