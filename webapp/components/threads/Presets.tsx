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

import * as React from 'react';
import { Check, ChevronsUpDown, Copy, Plus, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { useContext } from 'react';
// import { AppContext } from '@/context';
import useTranslation from '@/hooks/useTranslation';

const presets = [
  {
    id: 'Opla',
    name: 'Opla',
  },
  {
    id: 'gpt-3.5',
    name: 'ChatGPT-3.5',
  },
  {
    id: 'gpt-4',
    name: 'ChatGPT-4',
  },
];

export default function Presets() {
  // const { presets, setPresets } = useContext(AppContext);
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');

  return (
    <div className="w-full pb-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value ? presets.find((preset) => preset.id === value)?.name : t('Select a preset...')}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder={t('Search preset...')} />
            <CommandEmpty>{t('No preset found.')}</CommandEmpty>
            <CommandGroup>
              {presets.map((preset) => (
                <CommandItem
                  key={preset.id}
                  value={preset.id}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === preset.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {preset.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                }}
              >
                <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {t('Create a new preset')}
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                }}
              >
                <Copy className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {t('Duplicate selected preset')}
              </CommandItem>
              <CommandItem
                className="text-red-600"
                onSelect={() => {
                  setOpen(false);
                }}
              >
                <Trash className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {t('Delete selected preset')}
              </CommandItem>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
