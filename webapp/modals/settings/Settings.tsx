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

'use client';

import NavContainer from '@/components/NavContainer';
import useTranslation from '@/hooks/useTranslation';

export default function Settings({
  tab,
  onTabChanged,
  children,
}: {
  tab: string;
  onTabChanged: (newTab: string) => void;
  children: React.ReactNode;
}) {
  const menu = [
    {
      name: 'Appearance',
      id: 'appearance',
      href: 'appearance',
      hrefAlias: '/settings',
    },
    {
      name: 'Storage',
      id: 'storage',
      href: 'storage',
      hrefAlias: '/settings/storage',
    },
  ];

  const { t } = useTranslation();

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <div className="flex h-full w-[260px] flex-col">
        <div className="flex h-full min-h-0 flex-col ">
          <NavContainer>
            <div className="p1 text-ellipsis break-all pb-2 text-sm text-gray-600">
              {t('Settings')}
            </div>
            <li className="p1 flex flex-1 flex-col">
              {menu.map((item) => (
                <ul
                  key={item.id}
                  className={`${
                    item.href === tab || item.hrefAlias === tab
                      ? 'text-black dark:text-white'
                      : 'text-gray-400 dark:text-gray-400'
                  } rounded-md px-2 py-2 transition-colors duration-200 hover:bg-gray-500/10`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyUp={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      onTabChanged(item.href as string);
                    }}
                  >
                    <div>
                      <div className="flex cursor-pointer flex-row items-center break-all">
                        <div className="relative max-h-5 flex-1 overflow-hidden text-ellipsis break-all">
                          {t(item.name)}
                        </div>
                      </div>
                    </div>
                  </div>
                </ul>
              ))}
            </li>
          </NavContainer>
        </div>
      </div>
      {children}
    </div>
  );
}
