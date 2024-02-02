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
import { HardDriveDownload } from 'lucide-react';
import { Ui, Model } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/context/modals';
import { ModalIds } from '@/types/ui';
import logger from '@/utils/logger';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { shortcutAsText } from '@/utils/shortcuts';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import ContextMenuList from '../ui/ContextMenu/ContextMenuList';
import { Button } from '../ui/button';

function ModelsExplorer({
  models,
  selectedModelId,
  collection,
}: {
  models: Model[];
  selectedModelId?: string;
  collection: Model[];
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);

  const onSelectModel = (id: string) => {
    logger.info(`onSelectModel ${id}`);
    const route = Ui.Page.Models;
    router.push(`${route}/${id}`);
  };

  const onNewLocalModel = () => {
    showModal(ModalIds.NewLocalModel);
  };

  useShortcuts(ShortcutIds.INSTALL_MODEL, (event) => {
    event.preventDefault();
    logger.info('shortcut install Model');
    onNewLocalModel();
  });

  const menu: Ui.MenuItem[] = [
    {
      label: t('Uninstall'),
      onSelect: (data: string) => {
        logger.info(`rename ${data}`);
      },
    },
    {
      label: t('Install'),
      onSelect: (data: string) => {
        logger.info(`delete ${data}`);
      },
    },
  ];

  return (
    <div className="scrollbar-trigger flex h-full w-full flex-1 items-start border-r-[1px] border-neutral-300/30 bg-neutral-100 dark:border-neutral-900 dark:bg-neutral-800/70">
      <nav className="flex h-full w-full flex-col">
        <div className="flex w-full items-center dark:bg-neutral-800">
          <div className="flex grow items-center p-2">
            <p className="flex-1 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              {t('Models')}
            </p>
            <Button
              aria-label={t('Install local model')}
              title={`${t('Install local model')} ${shortcutAsText(ShortcutIds.INSTALL_MODEL)}`}
              variant="ghost"
              size="icon"
              onClick={onNewLocalModel}
            >
              <HardDriveDownload className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
        <div className="flex-1 flex-col overflow-y-auto overflow-x-hidden dark:border-white/20">
          <div className="flex flex-col gap-2 pb-2 text-sm dark:text-neutral-100">
            <div className="group relative flex flex-col gap-3 break-all rounded-md px-1 py-3">
              <div className="p1 text-ellipsis break-all text-neutral-600">{t('Local models')}</div>
              <ul className="p1 flex flex-1 flex-col">
                {models.map((model) => (
                  <li
                    key={model.id}
                    className={`${
                      selectedModelId === model.id
                        ? 'text-black dark:text-white'
                        : 'text-neutral-400 dark:text-neutral-400'
                    } rounded-md px-2 py-2 transition-colors duration-200 hover:bg-neutral-500/10`}
                  >
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <div
                          aria-label="Select a model"
                          role="button"
                          onKeyDown={() => {}}
                          onClick={(e) => {
                            e.preventDefault();
                            onSelectModel(model.id);
                          }}
                          className="flex cursor-pointer flex-row items-center"
                          tabIndex={0}
                        >
                          <div>
                            <div className="flex cursor-pointer flex-row items-center">
                              <div className="relative flex-1 overflow-hidden text-ellipsis break-all">
                                {model.title || model.name}
                              </div>
                            </div>
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuList data={model.id} menu={menu} />
                    </ContextMenu>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex-1 flex-col overflow-y-auto overflow-x-hidden dark:border-white/20">
          <div className="flex flex-col gap-2 pb-2 text-sm dark:text-neutral-100">
            <div className="group relative flex flex-col gap-3 break-all rounded-md px-1 py-3">
              <div className="p1 text-ellipsis break-all text-neutral-600">
                {t('Featured models')}
              </div>
              <ul className="p1 flex flex-1 flex-col">
                {collection.map((model) => (
                  <li
                    key={model.id}
                    className={`${
                      selectedModelId === model.id
                        ? 'text-black dark:text-white'
                        : 'text-neutral-400 dark:text-neutral-400'
                    } rounded-md px-2 py-2 transition-colors duration-200 hover:bg-neutral-500/10`}
                  >
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <div
                          aria-label="Select a model"
                          role="button"
                          onKeyDown={() => {}}
                          onClick={(e) => {
                            e.preventDefault();
                            onSelectModel(model.id);
                          }}
                          className="flex cursor-pointer flex-row items-center"
                          tabIndex={0}
                        >
                          <div>
                            <div className="flex cursor-pointer flex-row items-center">
                              <div className="relative flex-1 overflow-hidden text-ellipsis break-all">
                                {model.title || model.name}
                              </div>
                            </div>
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuList data={model.id} menu={menu} />
                    </ContextMenu>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default ModelsExplorer;
