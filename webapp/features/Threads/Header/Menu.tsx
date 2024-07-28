// Copyright 2024 Mik Bry
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
import { Archive, HardDriveDownload, MoreHorizontal, Plug, Plus, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Provider, ProviderType } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import { createProvider, getProviderState } from '@/utils/data/providers';
import OpenAI from '@/utils/providers/openai';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import logger from '@/utils/logger';
import { MenuAction } from '@/types/ui';
import { getStateColor } from '@/utils/ui';
import { useProviderStore } from '@/stores';
import { ShortcutBadge } from '../../../components/common/ShortCut';

type HeaderMenuProps = {
  selectedConversationId?: string;
  onSelectMenu: (menu: MenuAction, data: string) => void;
};

export default function HeaderMenu({ selectedConversationId, onSelectMenu }: HeaderMenuProps) {
  const { providers } = useProviderStore();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);

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
        <DropdownMenuGroup>
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
                className="text-destructive"
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
