'use client';

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

import Image from 'next/image';
import { BiChat, BiNetworkChart, BiCog, BiExtension, BiUserCircle } from 'react-icons/bi';
import Link from 'next/link';
import { IconType } from 'react-icons';
import { useRouter } from 'next/router';
import logger from '@/utils/logger';
import Tooltip, { Orientation } from './Tooltip';

type Item = {
  name: string;
  href?: string;
  icon?: IconType;
  items?: Array<Item>;
  flex?: number;
  hidden?: boolean;
};

const sidebarItems: Array<Item> = [
  {
    name: 'Tools',
    flex: 1,
    items: [
      {
        name: 'Chats',
        href: '/chats',
        icon: BiChat,
      },
      {
        name: 'Models',
        href: '/models',
        icon: BiNetworkChart,
      },
      {
        name: 'Plugins',
        href: '/plugins',
        icon: BiExtension,
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
        icon: BiUserCircle,
        hidden: true,
      },
      {
        name: 'Settings',
        href: '/settings',
        icon: BiCog,
      },
    ],
  },
];

const SidebarItems = ({ items, pathname }: { items: Array<Item>; pathname: string }) =>
  items.map(({ name, flex, href, icon, items: subItems, hidden }) => {
    if (hidden) return null;
    const Icon = icon as IconType;
    return subItems ? (
      <li className={flex ? 'flex-1' : ''} key={name}>
        <ul className="flex flex-col items-center">
          <SidebarItems items={subItems} pathname={pathname} />
        </ul>
      </li>
    ) : (
      <li className="p-2" key={name}>
        <Link
          className={`flex h-7 w-7 rounded-md ${
            pathname !== href
              ? 'text-gray-400 dark:text-gray-500'
              : 'text-gray-800 dark:text-gray-100'
          } dark:bg-gray-700`}
          href={href as string}
        >
          <Tooltip message={name} orientation={Orientation.Right}>
            <div className="h-7 w-7 hover:text-gray-800 dark:hover:text-gray-100">
              <Icon size="1.75rem" />
            </div>
          </Tooltip>
          <div className="hidden">{name}</div>
        </Link>
      </li>
    );
  });

function Sidebar() {
  const router = useRouter();
  const { pathname } = router;
  logger.info('pathname', pathname);

  return (
    <div className="h-full min-h-0">
      <aside className="flex h-full flex-col bg-gray-200 p-1 dark:bg-gray-700">
        <div className="flex items-center justify-center border-b border-gray-300 p-1 dark:border-gray-600">
          <Link className="mb-1 h-8 w-8" href="/">
            <Tooltip message="Dashboard" orientation={Orientation.Right}>
              <Image width={32} height={32} className="" src="/logo.png" alt="logo" />
            </Tooltip>
          </Link>
        </div>
        <ul className="p1 flex h-full flex-1 flex-col">
          <SidebarItems items={sidebarItems} pathname={pathname} />
        </ul>
      </aside>
    </div>
  );
}

export default Sidebar;
