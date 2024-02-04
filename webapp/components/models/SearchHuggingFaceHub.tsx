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

import useTranslation from '@/hooks/useTranslation';

import { CommandEmpty, CommandGroup, CommandItem, CommandLoading } from '@/components/ui/command';
import { Model } from '@/types';
import logger from '@/utils/logger';
import { searchModels } from '@/utils/providers/hf';
import { Checkbox } from '../ui/checkbox';

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

export default SearchHuggingFaceHub;
