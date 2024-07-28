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
import { AlertTriangle, Check, ChevronsUpDown, Copy, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverContentExt,
  PopoverTrigger,
} from '@/components/ui/popover';
import useTranslation from '@/hooks/useTranslation';
import { Conversation, ConversationPreset, Preset, Provider } from '@/types';
import { createPreset, getCompatiblePresets } from '@/utils/data/presets';
import { deepMerge } from '@/utils/data';
import { ModalData, ModalsContext, ModalIds } from '@/context/modals';
import { usePresetStore } from '@/stores';

type PresetsProps = {
  preset: Preset | undefined;
  presetProperties: Partial<Preset & ConversationPreset>;
  model: string | undefined;
  provider: Provider | undefined;
  portal?: boolean;
  onChangePreset: (preset: string) => void;
};

export default function Presets({
  preset,
  presetProperties,
  model,
  provider,
  portal = true,
  onChangePreset,
}: PresetsProps) {
  const { presets, setPresets } = usePresetStore();
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);
  const [open, setOpen] = useState(false);

  const compatibles = getCompatiblePresets(presets, model, provider);

  const duplicatePreset = (p: Preset, newName?: string) => {
    const { id, name, readonly, ...rest } = p;
    const template = deepMerge<Partial<Conversation>>(rest, presetProperties);
    delete template.currentPrompt;
    delete template.services;
    const newPreset = createPreset(newName || `${p.id}-copy`, p.parentId || id, template);
    setPresets([...presets, newPreset]);
    onChangePreset(newPreset.id);
  };

  const handleDuplicatePreset = (p: Preset) => {
    showModal(ModalIds.NewPreset, {
      item: p,
      onAction: async (action: string, data: ModalData) => {
        if (action === 'Duplicate') {
          duplicatePreset(p, data.item.name as string);
        }
      },
    });
  };

  const deletePreset = (p: Preset) => {
    setPresets(presets.filter((ps) => ps.id !== p.id));
  };
  const Content = portal ? PopoverContent : PopoverContentExt;

  return (
    <div className="w-full pb-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-transparent"
          >
            {preset ? presets.find((p) => p.id === preset?.id)?.name : t('Select a preset...')}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <Content className="w-full p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder={t('Search preset...')} />
              <CommandEmpty>{t('No preset found.')}</CommandEmpty>
              <CommandGroup>
                {presets.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={(currentValue) => {
                      // setValue(currentValue === value ? '' : currentValue);
                      onChangePreset(currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        preset && preset?.id === p?.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {p?.name}
                    <AlertTriangle
                      className={cn(
                        'ml-auto h-4 w-4 text-destructive',
                        compatibles[p.id] ? 'opacity-0' : 'opacity-100',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              {preset && (
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      handleDuplicatePreset(preset);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {t('Duplicate selected preset')}
                  </CommandItem>
                  {!preset?.readonly && (
                    <CommandItem
                      className="text-destructive"
                      onSelect={() => {
                        setOpen(false);
                        deletePreset(preset);
                      }}
                    >
                      <Trash className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      {t('Delete selected preset')}
                    </CommandItem>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </Content>
      </Popover>
    </div>
  );
}
