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

import { useEffect, useState } from 'react';
import { BrainCircuit, Computer } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  CommandLoading,
} from '@/components/ui/command';
import { getModelsCollection } from '@/utils/backend/commands';
import { Model } from '@/types';
import logger from '@/utils/logger';
import { ShortcutBadge } from '../common/ShortCut';

function SearchHuggingFaceHub({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  // const state = useCommandState((s) => s);
  // console.log('search state', state);
  // if (!state.search) return null;
  return <CommandGroup heading={heading}>{children}</CommandGroup>;
}

function NewLocalModel({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [search, setValue] = useState('');
  const [collection, setCollection] = useState<Model[]>([]);
  useEffect(() => {
    const getCollection = async () => {
      setLoading(true);
      const coll = (await getModelsCollection()) as unknown as { models: Model[] };
      const models = coll.models
        .filter((m) => m.featured === true)
        .map((m) => ({ ...m, id: m.name }));
      setCollection(models);
      setLoading(false);
    };
    getCollection();
  }, []);
  logger.info('raw collection: ', collection);

  const onValueChange = (s: string) => {
    setValue(s);
  };

  let filteredCollection = collection;
  console.log('search state', search);
  if (search) {
    filteredCollection = collection.filter((m) => m.name.includes(search));
  }

  return (
    <div className={cn('h-full', className)}>
      <Command className="rounded-lg border shadow-md" shouldFilter={false}>
        <CommandInput placeholder={t('Search a model to install')} onValueChange={onValueChange} />
        <CommandList>
          <CommandEmpty>{t('No model found')}</CommandEmpty>
          <CommandGroup heading="Featured">
            {loading && <CommandLoading>{t('Loading please wait...')}</CommandLoading>}
            {!loading &&
              filteredCollection.map((m) => (
                <CommandItem key={m.id}>
                  <span>{m.name}</span>
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandSeparator />
          <SearchHuggingFaceHub heading={t('Search in HuggingFace Hub')}>
            <CommandLoading>{t('Loading please wait...')}</CommandLoading>
          </SearchHuggingFaceHub>
          {!search && (
            <CommandGroup heading={t('Others')}>
              <CommandItem>
                <Computer className="mr-2 h-4 w-4" />
                <span>{t('Load a model from your computer')}</span>
                <CommandShortcut>
                  <ShortcutBadge command="load-model" />
                </CommandShortcut>
              </CommandItem>
              <CommandItem>
                <BrainCircuit className="mr-2 h-4 w-4" />
                <span>{t('Manage models')}</span>
                <CommandShortcut>
                  <ShortcutBadge command="display-models" />
                </CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
}

export default NewLocalModel;
