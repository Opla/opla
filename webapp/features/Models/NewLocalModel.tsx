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

import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { BrainCircuit, Computer, Sparkles } from 'lucide-react';
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
import { getModelsCollection, installModel, updateModelEntity } from '@/utils/backend/commands';
import { Model, ModelState } from '@/types';
import logger from '@/utils/logger';
import { deepMerge, getEntityName, getResourceUrl } from '@/utils/data';
import { findSameModel, getDownloadables, isValidFormat } from '@/utils/data/models';
import { ShortcutIds } from '@/hooks/useShortcuts';
import { ModalIds, Page } from '@/types/ui';
import { fileExists, getPathComponents, openFileDialog } from '@/utils/backend/tauri';
import { importModel, validateModelsFile } from '@/utils/models';
import ModelInfos from '@/components/common/ModelInfos';
import { ModalsContext } from '@/context/modals';
import { useModelsStore } from '@/stores';
import { ShortcutBadge } from '../../components/common/ShortCut';
import { toast } from '../../components/ui/Toast';
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
  const { showModal } = useContext(ModalsContext);

  const { updateBackendStore } = useBackend();
  const modelStorage = useModelsStore();
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

  const getFirstValidModel = (m: Model) => {
    if (!isValidFormat(m)) {
      const downloadables: Model[] = getDownloadables(m).filter(
        (d) => d.private !== true && isValidFormat(d),
      );
      const selectedModel = downloadables.find((d) => d.recommended) || downloadables[0];
      return deepMerge(m, selectedModel || {}, true);
    }
    return m;
  };

  const handleValueChange = (s: string) => {
    setValue(s);
  };

  const handleLocalInstall = async () => {
    const file = await openFileDialog(false, [
      { name: t('Choose a model file'), extensions: ['gguf', 'json'] },
    ]);
    if (typeof file === 'string') {
      const { path, name, filename, ext } = await getPathComponents(file);
      let model: Model | undefined;
      if (ext === 'json') {
        const validate = await validateModelsFile(file);
        logger.info('onLocalInstall', validate);
        if (!validate.success) {
          logger.error('onLocalInstall', validate.error);
          toast.error(`Not valid file ${file} ${validate.error}`);
          return;
        }
        model = importModel(validate.data);
      } else if (ext === 'gguf') {
        logger.info('onLocalInstall gguf', file);
        model = importModel({ id: name, name, download: filename });
      }
      if (model?.download && getResourceUrl(model.download).endsWith('.gguf')) {
        const download = getResourceUrl(model.download);
        const isExist = await fileExists(file);
        if (!isExist) {
          logger.error('onLocalInstall file not found', download, path);
          toast.error(`File not found ${file}`);
          onClose();
          return;
        }
        model.editable = true;
        let { id } = model;
        let success;
        const sameModel = findSameModel(model, modelStorage);
        if (sameModel?.state === ModelState.Removed) {
          sameModel.state = ModelState.Ok;
          ({ id } = sameModel);
          await updateModelEntity(sameModel);
          success = `${t('Model restored')} ${model.name}`;
          logger.info('onLocalRestored', id, model, path, download);
        } else if (!sameModel) {
          id = await installModel(model, undefined, path, download);
          logger.info('onLocalInstall', id, model, path, download);
        } else {
          toast.error(`${t('Model already exists')} ${model.name}`);
          onClose();
          return;
        }
        await updateBackendStore();

        if (!gotoModels) {
          router.push(`${Page.Models}/${id}`);
        }
        if (success) {
          toast.info(success);
        }
      } else {
        logger.error('onLocalInstall no download found', model);
        toast.error(`Not downloadable model file ${file} ${model}`);
        onClose();
        return;
      }
    }
    onClose();
  };

  const handleInstall = async (parentModel: Model, model?: Model) => {
    const selectedModel: Model = deepMerge(parentModel, model || {}, true);
    logger.info(`install ${model?.name}`, selectedModel);
    if (selectedModel.private === true) {
      delete selectedModel.private;
    }
    if (selectedModel.include) {
      delete selectedModel.include;
    }
    const path = getEntityName(selectedModel.creator || selectedModel.author);
    const sameModel = findSameModel(selectedModel, modelStorage);

    if (sameModel && sameModel.state !== ModelState.Removed) {
      toast.error(`${t('Model already exists')} ${selectedModel.name}`);
      return;
    }
    let id;
    let restored = false;
    if (sameModel?.state === ModelState.Removed) {
      sameModel.state = ModelState.Ok;
      await updateModelEntity(sameModel);
      logger.info(`restored ${sameModel.id}`);
      ({ id } = sameModel);
      restored = true;
    } else {
      id = await installModel(
        selectedModel,
        getResourceUrl(selectedModel.download),
        path,
        selectedModel.name,
      );
      logger.info(`installed ${id}`);
    }
    await updateBackendStore();

    if (!gotoModels) {
      router.push(`${Page.Models}/${id}`);
    }
    if (!restored) {
      showModal(ModalIds.Downloads, { item: selectedModel });
    } else {
      toast.success(`${t('Model restored')} ${selectedModel.name}`);
    }
  };

  let filteredCollection = collection;
  if (search) {
    filteredCollection = collection.filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase()),
    );
  }

  const handleSelect = (m: Model) => {
    const downloadables = getDownloadables(m).filter((d) => d.private !== true && isValidFormat(d));

    let item: Model = m;
    if (!isValidFormat(item) && downloadables.length > 0) {
      item = downloadables.find((d) => d.recommended) || downloadables[0];
    }

    if (isValidFormat(item)) {
      handleInstall(m, item);
    } else {
      logger.info(`No valid format ${item?.name} ${item?.library}`);
      toast.error(`No valid format ${item?.name} ${item?.library}`);
    }
    onSelected?.(m);
  };

  return (
    <div className={cn('h-full', className)}>
      <Command className="h-full rounded-lg border shadow-md" shouldFilter={false}>
        <CommandInput
          placeholder={t('Search a model to install')}
          onValueChange={handleValueChange}
        />
        <CommandList className="h-full">
          <CommandGroup
            heading={
              <div className="flex flex-row">
                <Sparkles className="mr-2 h-4 w-4" strokeWidth={1.5} /> {t('Featured')}
              </div>
            }
          >
            {!enabled && (
              <CommandEmpty>
                {t('No model found.')}
                <br />
                {t('Activate HugginFace Hub Search to get more results')}
              </CommandEmpty>
            )}
            {loading && <CommandLoading>{t('Loading please wait...')}</CommandLoading>}
            {!loading &&
              filteredCollection.map((m) => (
                <CommandItem
                  key={m.id}
                  onSelect={() => {
                    handleSelect(m);
                  }}
                >
                  <ModelInfos model={getFirstValidModel(m)} displayIcon className="w-full" />
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandSeparator />
          {search && (
            <SearchHuggingFaceHub
              search={search}
              enabled={enabled}
              onEnable={setEnabled}
              onSelected={handleSelect}
            />
          )}
          {!search && (
            <CommandGroup heading={t('Others')}>
              <CommandItem onSelect={handleLocalInstall}>
                <Computer className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span>{t('Load a model from your computer')}</span>
                <CommandShortcut>
                  <ShortcutBadge command={ShortcutIds.LOAD_MODEL} />
                </CommandShortcut>
              </CommandItem>
              {gotoModels && (
                <CommandItem>
                  <BrainCircuit className="mr-2 h-4 w-4" strokeWidth={1.5} />
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
