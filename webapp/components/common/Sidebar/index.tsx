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
import Image from 'next/image';
import {
  PiChats,
  PiHardDrives,
  PiGearSix,
  PiPackage,
  PiTreeStructure,
  PiUserCircle,
} from 'react-icons/pi';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/context/modals';
import logger from '@/utils/logger';
import Tooltip, { Orientation } from '../Tooltip';
import SidebarItems from './SidebarItems';
import { Item } from './types';

const sidebarItems: Array<Item> = [
  {
    name: 'Tools',
    flex: 1,
    items: [
      {
        name: 'Chats',
        href: '/threads',
        icon: PiChats,
      },
      {
        name: 'Models',
        href: '/models',
        icon: PiTreeStructure,
      },
      {
        name: 'AI Providers',
        href: '/providers',
        icon: PiHardDrives,
      },
      {
        name: 'Plugins',
        href: '/plugins',
        icon: PiPackage,
        hidden: true,
      },
    ],
  },
  {
    name: 'Config',
    items: [
      {
        name: 'Profile',
        href: '/profile',
        icon: PiUserCircle,
        hidden: true,
      },
      {
        name: 'Settings',
        href: '/settings',
        icon: PiGearSix,
        modal: true,
      },
    ],
  },
];

function Sidebar() {
  const router = useRouter();
  const { pathname } = router;
  logger.info('pathname', pathname);
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);

  const onModal = () => {
    showModal('settings');
  };

  return (
    <aside className="flex h-full flex-col border-r-[1px] border-neutral-300/30 bg-neutral-100 p-1 dark:border-neutral-900 dark:bg-neutral-800">
      <div className="flex hidden items-center justify-center border-b border-neutral-300 p-1 dark:border-neutral-600">
        <Link className="mb-1 h-8 w-8" href="/">
          <Tooltip message={t('Dashboard')} orientation={Orientation.Right}>
            <Image width={32} height={32} className="" src="/logo.png" alt="logo" />
          </Tooltip>
        </Link>
      </div>
      <ul className="p1 flex h-full flex-1 flex-col">
        <SidebarItems items={sidebarItems} pathname={pathname} t={t} onModal={onModal} />
      </ul>
    </aside>
  );
}

export default Sidebar;
