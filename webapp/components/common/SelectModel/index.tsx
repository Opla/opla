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

import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Logo, Model, ProviderType, Ui } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { getStateColor } from '@/utils/ui';
import ModelIcon from '@/components/common/ModelIcon';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import ModelInfos from '../ModelInfos';
import ServiceBadge from '../../../features/Threads/Header/ServiceBadge';

type SelectModelProps = {
  selectedModel?: Model;
  disabled?: boolean;
  selectedItem?: Ui.MenuItem;
  modelItems: Ui.MenuItem[];
  onSelectModel: (model: string, provider: ProviderType) => void;
  onEnableProvider?: () => void;
};

export default function SelectModel({
  selectedModel,
  disabled = false,
  selectedItem,
  modelItems,
  onSelectModel,
  onEnableProvider,
}: SelectModelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return selectedModel ? (
    <Popover open={modelItems.length > 1 && open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={modelItems.length < 2 || disabled}
          className="flex gap-4 px-2 capitalize text-foreground"
        >
          {selectedModel && <ModelInfos model={selectedModel} displayIcon />}
          {selectedItem && (
            <ServiceBadge
              state={selectedItem.state}
              providerName={selectedItem?.group}
              onEnableProvider={onEnableProvider}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-full p-0">
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
                        item.key === selectedModel.id ? 'opacity-100' : 'opacity-0',
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
  ) : (
    <span>{t('Select a model')}</span>
  );
}
