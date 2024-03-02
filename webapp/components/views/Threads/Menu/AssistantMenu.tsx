// Copyright 2024 mik
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

import { useContext, useState } from 'react';
import { Archive, Check, MoreHorizontal, Plug, Trash } from 'lucide-react';
// import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Provider, ProviderType, Ui } from '@/types';
import useBackend from '@/hooks/useBackendContext';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import { AppContext } from '@/context';
import { createProvider, getProviderState } from '@/utils/data/providers';
import OpenAI from '@/utils/providers/openai';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import logger from '@/utils/logger';
import { MenuAction } from '@/types/ui';
import { getStateColor } from '@/utils/ui';
import { cn } from '@/lib/utils';
import { useAssistantStore } from '@/stores';
import AssistantIcon from '@/components/common/AssistantIcon';
import { Badge } from '../../../ui/badge';
import { ShortcutBadge } from '../../../common/ShortCut';
import Pastille from '../../../common/Pastille';
import ModelInfos from '../../../common/ModelInfos';

type AssistantMenuProps = {
  selectedAssistantId: string;
  selectedTargetId?: string;
  selectedConversationId?: string;
  onSelectTarget: (model: string, provider: ProviderType) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
};

export default function AssistantMenu({
  selectedAssistantId,
  selectedTargetId,
  selectedConversationId,
  onSelectTarget,
  onSelectMenu,
}: AssistantMenuProps) {
  const { getAssistant } = useAssistantStore();
  const { providers } = useContext(AppContext);
  const { backendContext } = useBackend();
  const assistant = getAssistant(selectedAssistantId);
  const target = assistant?.targets?.find(
    (t) => t.id === selectedTargetId || assistant?.targets?.[0].id,
  );
  const targetState = target && !target.disabled ? Ui.BasicState.active : Ui.BasicState.disabled;
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);
  const selectedModelName = target?.models?.[0];
  const targetItems: Ui.MenuItem[] = []; // TODO get targets fro assistant
  /* const selectedItem = modelItems.find((item) => item.value === selectedModelName); */
  const selectedModel = backendContext.config.models.items.find(
    (model) => model.name === selectedModelName,
  );
  let chatGPT = providers.find(
    (p: Provider) => p.type === ProviderType.openai && p.name === OpenAI.template.name,
  );

  const handleEnableProvider = () => {
    /* if (selectedItem?.group) {
      const provider = findProvider(selectedItem?.group, providers) as Provider;
      if (provider && provider.disabled) {
        const newProviders = updateProvider(
          { ...(provider as Provider), disabled: !provider?.disabled },
          providers,
        );
        setProviders(newProviders);
      }
    } */
  };

  const handleSetupChatGPT = () => {
    if (!chatGPT) {
      chatGPT = createProvider(OpenAI.template.name as string, OpenAI.template);
    }
    showModal(ModalIds.OpenAI, { item: chatGPT });
  };

  const handleNewLocalModel = () => {
    showModal(ModalIds.NewLocalModel);
  };

  const handleNewProviderModel = () => {
    showModal(ModalIds.NewProvider);
  };

  useShortcuts(ShortcutIds.INSTALL_MODEL, (event) => {
    event.preventDefault();
    logger.info('shortcut install Model');
    handleNewLocalModel();
  });
  useShortcuts(ShortcutIds.NEW_PROVIDER, (event) => {
    event.preventDefault();
    logger.info('shortcut new provider');
    handleNewProviderModel();
  });
  useShortcuts(ShortcutIds.CONFIG_GPT, (event) => {
    event.preventDefault();
    logger.info('shortcut configure ChatGPT');
    handleSetupChatGPT();
  });

  return (
    <div className="flex w-full flex-col items-start justify-between rounded-md border px-4 py-0 sm:flex-row sm:items-center">
      <div className="flex grow items-center justify-between text-sm font-medium leading-none">
        <div className="flex grow items-center capitalize text-foreground">
          <AssistantIcon icon={assistant?.icon} name={assistant?.name} className="mr-2 h-4 w-4" />
          <span>{assistant?.name ?? t('Assistant not found')}</span>{' '}
          
        </div>
        <div className="flex-1" />
        <Button asChild onClick={handleEnableProvider}>
          <Badge
            className={cn(
              'mr-4 h-[24px] bg-gray-300 capitalize text-gray-600 hover:bg-gray-400',
              target?.disabled ? 'cursor-pointer' : '',
            )}
          >
            <span className={`mr-2  ${getStateColor(targetState, 'text', true)}`}>
              {target?.provider || 'local'}
            </span>
            <Pastille state={targetState} />
          </Badge>
        </Button>
      </div>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-full">
          <DropdownMenuLabel>{t('Target')}</DropdownMenuLabel>
          <DropdownMenuGroup>
            {targetItems.length < 2 && (
              <DropdownMenuItem onSelect={handleNewProviderModel}>
                <Check className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span className="capitalize">{target?.name || t('Select a target')}</span>
                {selectedModel && <ModelInfos model={selectedModel} stateAsIcon />}
              </DropdownMenuItem>
            )}
            {targetItems.length > 0 && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Check className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    <span className="capitalize">{target?.name || t('Select a target')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="p-0">
                    <Command>
                      <CommandInput placeholder={t('Filter target...')} autoFocus />
                      <CommandList>
                        <CommandEmpty>{t('No target found.')}</CommandEmpty>
                        <CommandGroup>
                          {targetItems.map((item) => (
                            <CommandItem
                              key={item.label}
                              value={item.value}
                              onSelect={() => {
                                onSelectTarget(item.value as string, item.group as ProviderType);
                                setOpen(false);
                              }}
                              className="flex w-full items-center justify-between"
                            >
                              <span className="capitalize">{item.label}</span>
                              <Badge
                                variant="secondary"
                                className={`ml-4 bg-gray-300 capitalize text-gray-600 ${getStateColor(item.state, 'text', true)}`}
                              >
                                {item.group || 'local'}
                              </Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onSelect={handleSetupChatGPT}>
              <Plug
                className={`mr-2 h-4 w-4 ${getStateColor(getProviderState(chatGPT), 'text')}`}
                strokeWidth={1.5}
              />
              {t('Configure ChatGPT')}
              <DropdownMenuShortcut>
                <ShortcutBadge command={ShortcutIds.CONFIG_GPT} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            {selectedConversationId && <DropdownMenuSeparator />}
          </DropdownMenuGroup>
          {selectedConversationId && (
            <>
              <DropdownMenuLabel>{t('Thread')}</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className=""
                  onSelect={() =>
                    onSelectMenu(MenuAction.ArchiveConversation, selectedConversationId)
                  }
                >
                  <Archive className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {t('Archive')}
                  <DropdownMenuShortcut>
                    <ShortcutBadge command={ShortcutIds.ARCHIVE_CONVERSATION} />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onSelect={() =>
                    onSelectMenu(MenuAction.DeleteConversation, selectedConversationId)
                  }
                >
                  <Trash className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {t('Delete')}
                  <DropdownMenuShortcut>
                    <ShortcutBadge command={ShortcutIds.DELETE_CONVERSATION} />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
