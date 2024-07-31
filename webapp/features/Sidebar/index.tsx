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

import React, { useContext } from 'react';
import Image from 'next/image';
import {
  Bot,
  BrainCircuit,
  Keyboard,
  LucideIcon,
  MessagesSquare,
  Package,
  Server,
  Settings,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { DiscordLogoIcon, GitHubLogoIcon, UpdateIcon } from '@radix-ui/react-icons';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/modals/context';
// import logger from '@/utils/logger';
import { ModalIds } from '@/modals';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useBackend from '@/hooks/useBackendContext';
import { Ui } from '@/types';
import { ShortcutIds } from '@/hooks/useShortcuts';
import { checkForNewUpdate } from '@/utils/backend/tauri';
import { isMac } from '@/utils/misc';
import SidebarItems from './SidebarItems';

const sidebarItems: Array<Ui.Item> = [
  {
    name: 'Tools',
    flex: 1,
    items: [
      {
        name: 'Threads',
        href: Ui.Page.Threads,
        page: Ui.Page.Threads,
        icon: MessagesSquare,
        shortcut: ShortcutIds.DISPLAY_THREADS,
      },
      {
        name: 'My Assistants',
        href: Ui.Page.Assistants,
        page: Ui.Page.Assistants,
        icon: Bot,
        shortcut: ShortcutIds.DISPLAY_ASSISTANTS,
      },
      {
        name: 'Models',
        href: Ui.Page.Models,
        page: Ui.Page.Models,
        icon: BrainCircuit,
        shortcut: ShortcutIds.DISPLAY_MODELS,
      },
      {
        name: 'AI Providers',
        href: Ui.Page.Providers,
        page: Ui.Page.Providers,
        icon: Server,
        shortcut: ShortcutIds.DISPLAY_PROVIDERS,
      },
      {
        name: 'Plugins',
        href: '/plugins',
        icon: Package,
        hidden: true,
      },
    ],
  },
  {
    name: 'Config',
    items: [
      {
        name: 'Github',
        href: 'https://github.com/Opla/opla',
        renderIcon: () => <GitHubLogoIcon className="h-7 w-7" />,
        target: true,
      },
      {
        name: 'Discord',
        href: 'https://discord.gg/szayZWCeXn',
        renderIcon: () => <DiscordLogoIcon className="h-7 w-7" />,
        target: true,
      },
      {
        name: 'Settings',
        icon: Settings,
        modal: true,
        items: [
          {
            name: 'Settings',
            icon: Settings2,
            href: '/settings',
            shortcut: ShortcutIds.DISPLAY_SETTINGS,
            modal: true,
          },
          {
            name: 'Keyboard shortcuts',
            icon: Keyboard,
            href: '/shortcuts',
            shortcut: ShortcutIds.DISPLAY_SHORTCUTS,
            modal: true,
          },
          { name: '-' },
          {
            name: 'Check for updates...',
            icon: UpdateIcon as LucideIcon,
            href: '/updates',
            modal: true,
          },
        ],
      },
    ],
  },
];

function Sidebar() {
  const router = useRouter();
  const { pathname } = router;
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);
  const { settings } = useBackend();

  const isTitlebarTransparent = isMac();

  sidebarItems[0].items = (sidebarItems[0].items as Ui.Item[]).map((item) => {
    let { href } = item;
    if (item.page && settings?.selectedPage?.startsWith(item.page)) {
      href = settings?.selectedPage;
    }
    if (item.page) {
      const page = settings?.pages?.[item.page];
      if (page?.selectedId) {
        href = `${item.page}/${page.selectedId}`;
      }
    }

    return { ...item, href };
  });

  const handleModal = (href: string) => {
    if (href === '/settings') {
      showModal(ModalIds.Settings);
    } else if (href === '/shortcuts') {
      showModal(ModalIds.Shortcuts);
    } else if (href === '/updates') {
      checkForNewUpdate(t);
    }
  };

  return (
    <aside className="flex h-full flex-col">
      {isTitlebarTransparent && (
        <div
          className="h-14 w-full border-b-[1px] bg-secondary/70 text-secondary/70"
          data-tauri-drag-region
        >
          -
        </div>
      )}
      <ul className="p1 flex h-full flex-1 flex-col border-r-[1px] border-secondary-foreground/5 bg-secondary/70 p-1 pb-4">
        <SidebarItems items={sidebarItems} pathname={pathname} t={t} onModal={handleModal} />
      </ul>
    </aside>
  );
}

export default Sidebar;
