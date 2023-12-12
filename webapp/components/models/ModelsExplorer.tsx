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

import { AppContext } from '@/context';
import Link from 'next/link';
import { useContext } from 'react';
import { BiPlus } from 'react-icons/bi';
import { MenuItem } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import ContextMenu from '../common/ContextMenu';

function ModelsExplorer({ selectedModelId }: { selectedModelId?: string }) {
  const { models } = useContext(AppContext);
  const { t } = useTranslation();
  const menu: MenuItem[] = [
    {
      label: t('Rename'),
      onSelect: (data: string) => {
        logger.info(`rename ${data}`);
      },
    },
    {
      label: t('Delete'),
      onSelect: (data: string) => {
        logger.info(`delete ${data}`);
      },
    },
  ];

  return (
    <div className="scrollbar-trigger flex h-full w-full flex-1 items-start bg-neutral-100 dark:bg-neutral-800/70">
      <nav className="flex h-full flex-1 flex-col space-y-1 p-1">
        <div className="m-2 mb-1 flex flex-shrink-0 cursor-pointer items-center gap-2 rounded-md border px-4 py-1 text-sm text-neutral-400 transition-colors duration-200 hover:bg-neutral-500/10 hover:text-white dark:border-white/20 dark:text-neutral-400 hover:dark:text-white">
          <BiPlus className="h-4 w-4" />
          {t('Add a model')}
        </div>
        <div className="flex-1 flex-col overflow-y-auto overflow-x-hidden dark:border-white/20">
          <div className="flex flex-col gap-2 pb-2 text-sm dark:text-neutral-100">
            <div className="group relative flex flex-col gap-3 break-all rounded-md px-1 py-3">
              <div className="p1 text-ellipsis break-all text-neutral-600">{t('Local models')}</div>
              <li className="p1 flex flex-1 flex-col">
                {models.map((model) => (
                  <ul
                    key={model.id}
                    className={`${
                      selectedModelId === model.id
                        ? 'text-black dark:text-white'
                        : 'text-neutral-400 dark:text-neutral-400'
                    } rounded-md px-2 py-2 transition-colors duration-200 hover:bg-neutral-500/10`}
                  >
                    <ContextMenu data={model.id} menu={menu}>
                      <Link href={`/models/${model.id}`}>
                        <div>
                          <div className="flex cursor-pointer flex-row items-center">
                            <div className="relative flex-1 overflow-hidden text-ellipsis break-all">
                              {model.name}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </ContextMenu>
                  </ul>
                ))}
              </li>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default ModelsExplorer;
