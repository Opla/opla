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

import React, { useEffect, useState } from 'react';
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
import useBackend from '@/hooks/useBackendContext';
import { getModelsCollection, installModel } from '@/utils/backend/commands';
import { Model } from '@/types';
import logger from '@/utils/logger';
import { searchModels } from '@/utils/providers/hf';
import { deepMerge, getEntityName, getResourceUrl } from '@/utils/data';
import { getDownloadables, isValidFormat } from '@/utils/data/models';
import { ShortcutBadge } from '../common/ShortCut';
import { Checkbox } from '../ui/checkbox';
import { toast } from '../ui/Toast';

function SearchHuggingFaceHub({
  search,
  enabled,
  onEnable,
  onSelected,
}: {
  search: string;
  enabled: boolean;
  onEnable: (enabled: boolean) => void;
  onSelected?: (model: Model) => void;
}) {
  const { t } = useTranslation();

  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<Model[]>([]);
  useEffect(() => {
    const searchHub = async () => {
      setSearching(true);
      const coll = await searchModels(search);
      setResult(coll);
      logger.info('searchModels', coll);
      setSearching(false);
    };
    if (enabled) {
      searchHub();
    } else {
      setResult([]);
    }
  }, [search, enabled]);
  const onEnableSearch = (checked: boolean) => {
    onEnable(checked);
  };

  return (
    <CommandGroup
      heading={
        <div className="flex w-full justify-between">
          <div>
            <span className="mr-2">🤗</span>HuggingFace Hub
          </div>
          <Checkbox onCheckedChange={onEnableSearch} />
        </div>
      }
    >
      {searching && <CommandLoading>{t('Searching please wait...')}</CommandLoading>}
      {result.length === 0 && !searching && <CommandEmpty>{t('No model found')}</CommandEmpty>}
      {result.length > 0 &&
        !searching &&
        result.map((m) => (
          <CommandItem
            key={m.id}
            onSelect={() => {
              onSelected?.(m);
            }}
          >
            {m.name}
          </CommandItem>
        ))}
    </CommandGroup>
  );
}

function NewLocalModel({
  className,
  onSelected,
}: {
  className?: string;
  onSelected?: (model?: Model) => void;
}) {
  const { updateBackendStore } = useBackend();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [search, setValue] = useState('');
  const [collection, setCollection] = useState<Model[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const getCollection = async () => {
      setLoading(true);
      const coll = (await getModelsCollection()) as unknown as { models: Model[] };
      const newModels = coll.models.filter((m) => m.featured === true);
      setCollection(newModels);
      setLoading(false);
    };
    getCollection();
  }, []);

  const onValueChange = (s: string) => {
    setValue(s);
  };

  const onInstall = async (parentModel: Model, model?: Model) => {
    const selectedModel: Model = deepMerge(parentModel, model || {}, true);
    logger.info(`install ${model?.name}`, selectedModel);
    if (selectedModel.private === true) {
      delete selectedModel.private;
    }
    if (selectedModel.include) {
      delete selectedModel.include;
    }
    const path = getEntityName(selectedModel.creator || selectedModel.author);
    const id = await installModel(
      selectedModel,
      getResourceUrl(selectedModel.download),
      path,
      selectedModel.name,
    );
    await updateBackendStore();
    logger.info(`installed ${id}`);
  };

  let filteredCollection = collection;
  if (search) {
    filteredCollection = collection.filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase()),
    );
  }

  const onSelect = (m: Model) => {
    const downloadables = getDownloadables(m).filter((d) => d.private !== true && isValidFormat(d));

    let item: Model = m;
    if (!isValidFormat(item) && downloadables.length > 0) {
      item = downloadables.find((d) => d.recommended) || downloadables[0];
    }

    if (isValidFormat(item)) {
      onInstall(m, item);
    } else {
      logger.info(`No valid format ${item?.name} ${item?.library}`);
      toast.error(`No valid format ${item?.name} ${item?.library}`);
    }
    onSelected?.(m);
  };

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
                <CommandItem
                  key={m.id}
                  onSelect={() => {
                    onSelect(m);
                  }}
                >
                  <span>{m.name}</span>
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandSeparator />
          {search && (
            <SearchHuggingFaceHub search={search} enabled={enabled} onEnable={setEnabled} />
          )}
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
