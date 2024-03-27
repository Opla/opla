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

import { useContext, useState } from 'react';
import { Archive, Check, HardDriveDownload, MoreHorizontal, Plug, Plus, Trash } from 'lucide-react';
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
import { Ui, Provider, ProviderType } from '@/types';
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
import { Badge } from '../../../ui/badge';
import { ShortcutBadge } from '../../../common/ShortCut';

type ModelMenuProps = {
  selectedModelName: string;
  selectedConversationId?: string;
  modelItems: Ui.MenuItem[];
  onSelectModel: (model: string, provider: ProviderType) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
};

export default function ModelMenu({
  selectedModelName,
  selectedConversationId,
  modelItems,
  onSelectModel,
  onSelectMenu,
}: ModelMenuProps) {
  const { providers } = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);
  const selectedItem = modelItems.find((item) => item.value === selectedModelName);

  let chatGPT = providers.find(
    (p: Provider) => p.type === ProviderType.openai && p.name === OpenAI.template.name,
  );

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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-full">
        <DropdownMenuLabel>{t('Model')}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {modelItems.length > 0 && (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Check className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  <span className="capitalize">{selectedItem?.label || t('Select a model')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-0">
                  <Command>
                    <CommandInput placeholder={t('Filter model...')} autoFocus />
                    <CommandList>
                      <CommandEmpty>{t('No Model found.')}</CommandEmpty>
                      <CommandGroup>
                        {modelItems.map((item) => (
                          <CommandItem
                            key={item.key || item.label}
                            value={item.value}
                            onSelect={() => {
                              onSelectModel(item.value as string, item.group as ProviderType);
                              setOpen(false);
                            }}
                            className="flex w-full items-center justify-between"
                          >
                            <span className="capitalize">{item.label}</span>
                            <Badge
                              variant="secondary"
                              className={`ml-4 bg-gray-300 capitalize text-gray-600 ${getStateColor(item.state, 'text', true)}`}
                            >
                              {item.group && item.group !== 'Opla' ? item.group : 'local'}
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
          <DropdownMenuItem onSelect={handleNewLocalModel}>
            <HardDriveDownload className="mr-2 h-4 w-4" strokeWidth={1.5} />
            {t('Install local model')}
            <DropdownMenuShortcut>
              <ShortcutBadge command={ShortcutIds.INSTALL_MODEL} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
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
          <DropdownMenuItem
            onSelect={() => {
              handleNewProviderModel();
            }}
          >
            <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
            {t('Add other AI providers')}
            <DropdownMenuShortcut>
              <ShortcutBadge command={ShortcutIds.NEW_PROVIDER} />
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
                onSelect={() => onSelectMenu(MenuAction.DeleteConversation, selectedConversationId)}
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
  );
}