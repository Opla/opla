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
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Plus, Server } from 'lucide-react';
import { AppContext } from '@/context';
import { Ui, Provider, ProviderType, ServerStatus } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { ModalsContext } from '@/context/modals';
import { deleteProvider, findProvider, updateProvider } from '@/utils/data/providers';
import useBackend from '@/hooks/useBackendContext';
import { ModalIds } from '@/modals';
import { ContextMenuTrigger } from '@radix-ui/react-context-menu';
import { Page } from '@/types/ui';
import { Button } from '../ui/button';
import { ContextMenu } from '../ui/context-menu';
import ContextMenuList from '../ui/ContextMenu/ContextMenuList';

function ProvidersExplorer({ selectedProviderId }: { selectedProviderId?: string }) {
  const { providers, setProviders } = useContext(AppContext);
  const { backendContext } = useBackend();

  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);
  const router = useRouter();

  const createNewProvider = () => {
    logger.info('create new provider');
    showModal(ModalIds.NewProvider);
  };

  const onDelete = (action: string, data: any) => {
    const provider = data?.item as Provider;
    logger.info(`delete ${action} ${data}`);
    if (provider) {
      if (action === 'Delete') {
        const updatedProviders = deleteProvider(provider.id, providers);
        setProviders(updatedProviders);
        if (selectedProviderId && selectedProviderId === provider.id) {
          router.replace(Page.Providers);
        }
      }
    }
  };

  const onToDelete = (data: string) => {
    logger.info(`to delete ${data}`);
    const provider = findProvider(data, providers) as Provider;
    showModal(ModalIds.DeleteItem, { item: provider, onAction: onDelete });
  };

  const onProviderToggle = (data: string) => {
    logger.info('onProviderToggle');
    const provider = findProvider(data, providers) as Provider;
    const newProviders = updateProvider(
      { ...(provider as Provider), disabled: !provider?.disabled },
      providers,
    );
    setProviders(newProviders);
  };

  const menu: Ui.MenuItem[] = [
    {
      label: t('Disable'),
      onSelect: (data: string) => {
        logger.info(`disable ${data}`);
        onProviderToggle(data);
      },
    },
    {
      label: t('Delete'),
      onSelect: onToDelete,
    },
  ];
  const menuDisabled: Ui.MenuItem[] = [
    {
      label: t('Enable'),
      onSelect: (data: string) => {
        logger.info(`enable ${data}`);
        onProviderToggle(data);
      },
    },
    {
      label: t('Delete'),
      onSelect: onToDelete,
    },
  ];

  const isDisabled = (provider: Provider) => {
    if (provider?.type === ProviderType.opla) {
      return backendContext.server?.status !== ServerStatus.STARTED;
    }
    return provider?.disabled;
  };

  return (
    <div className="scrollbar-trigger flex h-full w-full flex-1 items-start border-r-[1px] border-neutral-300/30 bg-neutral-100 dark:border-neutral-900 dark:bg-neutral-800/70">
      <nav className="flex h-full flex-1 flex-col space-y-1">
        <div className="flex w-full flex-row p-3">
          <Button
            className="w-full"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              createNewProvider();
            }}
          >
            <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
            {t('New AI provider')}
          </Button>
        </div>

        <div className="flex-1 flex-col overflow-y-auto overflow-x-hidden dark:border-white/20">
          <div className="flex flex-col gap-2 pb-2 text-sm dark:text-neutral-100">
            <div className="group relative flex flex-col gap-3 break-all rounded-md px-1 py-3">
              <div className="p1 text-ellipsis break-all text-neutral-600">{t('Providers')}</div>
              <ul className="p1 flex flex-1 flex-col">
                {providers.map((provider) => (
                  <li
                    key={provider.id}
                    className={`${
                      selectedProviderId === provider.id
                        ? 'text-black dark:text-white'
                        : 'text-neutral-400 dark:text-neutral-400'
                    } rounded-md px-2 py-2 transition-colors duration-200 hover:bg-neutral-500/10`}
                  >
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <Link href={`${Page.Providers}/${provider.id}`}>
                          <div>
                            <div className="flex cursor-pointer flex-row items-center">
                              <div className="relative flex-1 overflow-hidden text-ellipsis break-all">
                                {provider.name}
                              </div>
                              <div
                                className={`${
                                  isDisabled(provider) ? 'text-gray-500' : 'text-green-500'
                                } `}
                              >
                                <Server className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      </ContextMenuTrigger>
                      <ContextMenuList
                        data={provider.id}
                        menu={isDisabled(provider) ? menuDisabled : menu}
                      />
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

export default ProvidersExplorer;
