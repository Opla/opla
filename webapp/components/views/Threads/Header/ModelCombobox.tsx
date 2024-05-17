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

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

import { Ui, ProviderType, Logo } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { getStateColor } from '@/utils/ui';
import ModelIcon from '@/components/common/ModelIcon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '../../../ui/badge';

type ModelComboboxProps = {
  title: React.ReactElement;
  selectedModelId?: string;
  modelItems: Ui.MenuItem[];
  onSelectModel: (model: string, provider: ProviderType) => void;
};

export default function ModelDropdown({
  title,
  selectedModelId,
  modelItems,
  onSelectModel,
}: ModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{title}</PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        {modelItems.length > 0 && (
          <Command>
            <CommandInput placeholder={t('Filter model...')} autoFocus />
            <CommandList>
              <CommandEmpty>{t('No Model found.')}</CommandEmpty>
              <CommandGroup>
                {modelItems.map((item) => (
                  <CommandItem
                    key={item.key}
                    value={item.value}
                    onSelect={() => {
                      onSelectModel(item.key as string, item.group as ProviderType);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        item.key === selectedModelId ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex w-full items-center gap-2">
                      <ModelIcon
                        icon={item.icon as unknown as Logo}
                        name={item.label}
                        providerName={item.group?.toLowerCase()}
                        className="h-4 w-4"
                      />
                      <span className="capitalize">{item.label}</span>{' '}
                    </div>

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
        )}
      </PopoverContent>
    </Popover>
  );
}
