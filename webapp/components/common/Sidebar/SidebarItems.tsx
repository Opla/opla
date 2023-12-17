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

import { Item } from './types';
import SidebarItem from './SidebarItem';

export default function SidebarItems({
  items,
  pathname,
  t,
  onModal,
}: {
  items: Array<Item>;
  pathname: string;
  t: any;
  onModal: (href: string) => void;
}) {
  return items.map(({ name, flex, href, icon, modal, items: subItems, hidden }) => {
    if (hidden) return null;

    return subItems ? (
      <li className={flex ? 'flex-1' : ''} key={name}>
        <ul className="flex flex-col items-center">
          <SidebarItems items={subItems} pathname={pathname} t={t} onModal={onModal} />
        </ul>
      </li>
    ) : (
      <SidebarItem
        key={name}
        selected={href === pathname || !!(href && pathname.startsWith(href))}
        href={href}
        name={t(name)}
        icon={icon}
        onModalClick={onModal}
        modal={modal}
      />
    );
  });
}
