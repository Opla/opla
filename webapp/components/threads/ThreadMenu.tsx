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
import { Check, HardDriveDownload, MoreHorizontal, Plug, Plus, Trash } from 'lucide-react';
import { useRouter } from 'next/router';
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
import { MenuItem } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';

export default function ThreadMenu({
  selectedModel,
  modelItems,
  onSelectModel,
}: {
  selectedModel: string;
  modelItems: MenuItem[];
  onSelectModel: (model: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);
  const selectedItem = modelItems.find((item) => item.value === selectedModel);

  const onSetupChatGPT = () => {
    showModal(ModalIds.OpenAI);
  };

  return (
    <div className="flex w-full flex-col items-start justify-between rounded-md border px-4 py-0 sm:flex-row sm:items-center">
      <p className="text-sm font-medium leading-none">
        <span className="text-muted-foreground">{selectedItem?.label || t('Select a model')}</span>
      </p>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel>{t('Model')}</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Check className="mr-2 h-4 w-4" />
                {selectedItem?.label || t('Select a model')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-0">
                <Command>
                  <CommandInput placeholder={t('Filter model...')} autoFocus />
                  <CommandList>
                    <CommandEmpty>{t('No Model found.')}</CommandEmpty>
                    <CommandGroup>
                      {modelItems.map((item) => (
                        <CommandItem
                          key={item.label}
                          value={item.value}
                          onSelect={() => {
                            onSelectModel(item.value as string);
                            setOpen(false);
                          }}
                        >
                          {item.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <HardDriveDownload className="mr-2 h-4 w-4" />
              {t('Install local model')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSetupChatGPT}>
              <Plug className="mr-2 h-4 w-4" />
              {t('Connect to ChatGPT')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                router.push('/providers');
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('Add other AI providers')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </DropdownMenuGroup>
          <DropdownMenuLabel>{t('Thread')}</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem className="text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              {t('Delete')}
              <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
