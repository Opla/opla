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

'use client';

import { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { Ui } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SidebarItem from './SidebarItem';
import { ShortcutBadge } from '../ShortCut';

export default function SidebarItems({
  items,
  pathname,
  t,
  onModal,
}: {
  items: Array<Ui.Item>;
  pathname: string;
  t: any;
  onModal: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return items.map(({ name, flex, href, page, icon, shortcut, modal, items: subItems, hidden }) => {
    if (hidden) return null;

    if (modal && subItems) {
      const Icon = icon as LucideIcon;
      const className = `flex pb-8 h-6 w-6 rounded-md ${
        open ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'
      } dark:transparent`;
      return (
        <li key={name} className={className}>
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger>
              <div className="h-5 w-5 p-0 hover:text-neutral-800 dark:hover:text-neutral-100">
                <Icon size="28px" strokeWidth={1.5} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-0" side="right" align="end" alignOffset={-24}>
              {subItems.map((item) => {
                const IIcon = item.icon as LucideIcon;
                return item.name === '-' ? (
                  <DropdownMenuSeparator key={item.name} />
                ) : (
                  <DropdownMenuItem
                    key={item.name}
                    onSelect={() => {
                      if (item.href) {
                        onModal(item.href);
                      }
                    }}
                  >
                    {IIcon && <IIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />}
                    {item.name}
                    {item.shortcut && (
                      <DropdownMenuShortcut>
                        <ShortcutBadge command={item.shortcut} />
                      </DropdownMenuShortcut>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      );
    }
    return subItems ? (
      <li className={flex ? 'flex-1' : ''} key={name}>
        <ul className="flex flex-col items-center">
          <SidebarItems items={subItems} pathname={pathname} t={t} onModal={onModal} />
        </ul>
      </li>
    ) : (
      <SidebarItem
        key={name}
        selected={
          href === pathname ||
          !!(href && pathname.startsWith(href)) ||
          !!(page && pathname.startsWith(page))
        }
        href={href}
        name={t(name)}
        icon={icon}
        shortcut={shortcut}
        onModalClick={onModal}
        modal={modal}
      />
    );
  });
}
