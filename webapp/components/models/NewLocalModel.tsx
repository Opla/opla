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
import { useRouter } from 'next/router';
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
import { deepMerge, getEntityName, getResourceUrl } from '@/utils/data';
import { getDownloadables, isValidFormat } from '@/utils/data/models';
import { ShortcutIds } from '@/hooks/useShortcuts';
import { Page } from '@/types/ui';
import { fileExists, openFileDialog } from '@/utils/backend/tauri';
import { importModel, validateModelsFile } from '@/utils/models';
import { ShortcutBadge } from '../common/ShortCut';
import { toast } from '../ui/Toast';
import SearchHuggingFaceHub from './SearchHuggingFaceHub';


function NewLocalModel({
  className,
  onSelected,
  onClose,
}: {
  className?: string;
  onSelected?: (model?: Model) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { pathname } = router;
  const gotoModels = !pathname.startsWith(Page.Models);

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

  const onLocalInstall = async () => {
    const file = await openFileDialog(false, [
      { name: t('Choose a model file'), extensions: ['gguf', 'json'] },
    ]);
    if (typeof file === 'string') {
      const filepath = file.substring(0, file.lastIndexOf('/'));
      let model: Model | undefined;
      if (file.endsWith('.json')) {
        const validate = await validateModelsFile(file);
        logger.info('onLocalInstall', validate);
        if (!validate.success) {
          logger.error('onLocalInstall', validate.error);
          toast.error(`Not valid file ${file} ${validate.error}`);
          return;
        }
        model = importModel(validate.data);
      } else if (file.endsWith('.gguf')) {
        const name = file.substring(file.lastIndexOf('/') + 1, file.lastIndexOf('.'));
        const filename = file.substring(file.lastIndexOf('/') + 1);
        logger.info('onLocalInstall gguf', file);
        model = importModel({ id: name, name, download: filename });
      }
      if (model?.download && getResourceUrl(model.download).endsWith('.gguf')) {
        const download = getResourceUrl(model.download);
        const isExist = await fileExists(download, filepath);
        if (!isExist) {
          logger.error('onLocalInstall file not found', download, filepath);
          toast.error(`File not found ${file}`);
          return;
        }
        const id = await installModel(model, undefined, filepath, download);
        await updateBackendStore();
        logger.info('onLocalInstall', id, model, filepath, download);
        if (!gotoModels) {
          router.push(`${Page.Models}/${id}`);
        }
      } else {
        logger.error('onLocalInstall no download found', model);
        toast.error(`Not downloadable model file ${file} ${model}`);
        return;
      }
    }
    onClose();
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
    if (!gotoModels) {
      router.push(`${Page.Models}/${id}`);
    }
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
              <CommandItem onSelect={onLocalInstall}>
                <Computer className="mr-2 h-4 w-4" />
                <span>{t('Load a model from your computer')}</span>
                <CommandShortcut>
                  <ShortcutBadge command={ShortcutIds.LOAD_MODEL} />
                </CommandShortcut>
              </CommandItem>
              {gotoModels && (
                <CommandItem>
                  <BrainCircuit className="mr-2 h-4 w-4" />
                  <span>{t('Manage models')}</span>
                  <CommandShortcut>
                    <ShortcutBadge command={ShortcutIds.DISPLAY_MODELS} />
                  </CommandShortcut>
                </CommandItem>
              )}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
}

export default NewLocalModel;
