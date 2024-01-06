// Copyright 2023 Mik Bry
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
// Copyright 2023 Mik Bry
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

import { useContext } from 'react';
import { DownloadIcon } from '@radix-ui/react-icons';
import useBackend from '@/hooks/useBackend';
import useTranslation from '@/hooks/useTranslation';
import { Model } from '@/types';
import { getDownloads, getEntityName, getResourceUrl, isValidFormat } from '@/utils/data/models';
import { ModalIds } from '@/modals';
import { ModalsContext } from '@/context/modals';
import logger from '@/utils/logger';
import Parameter from '../common/Parameter';
import { Button } from '../ui/button';
import { Table, TableBody, TableRow, TableCell, TableHeader, TableHead } from '../ui/table';

function ModelView({ modelId, collection }: { modelId?: string; collection: Model[] }) {
  const { backendContext } = useBackend();
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);

  const models = backendContext.config.models.items;
  let local = true;
  let model = models.find((m) => m.id === modelId) as Model;
  if (!model && modelId) {
    model = collection.find((m) => m.id === modelId) as Model;
    local = false;
  }

  if (!model) {
    return null;
  }

  const downloads = getDownloads(model).filter((d) => d.private !== true && isValidFormat(d));

  const onDownload = () => {
    logger.info(`TODO download ${model.name} ${getResourceUrl(model.download)}`);
  };

  const onDelete = () => {
    logger.info(`TODO delete ${model.name} ${getResourceUrl(model.download)}`);
  };

  const onChange = (selectedModel?: Model) => {
    if (local && !selectedModel) {
      showModal(ModalIds.DeleteItem, { item: model, onAction: onDelete });
      return;
    }
    let item: Model = selectedModel || model;
    // If the model is not a GGUF model, we need to find the recommended or first download
    if (!isValidFormat(item) && downloads.length > 0) {
      item = downloads.find((d) => d.recommended) || downloads[0];
    }

    if (isValidFormat(item)) {
      showModal(ModalIds.DownloadItem, { item, onAction: onDownload });
    } else {
      logger.info(`No valid format ${item?.name} ${item?.library}`);
      // TODO: display toaster
    }
  };

  return (
    <div className="flex max-w-full flex-1 flex-col dark:bg-neutral-800/30">
      <div className="transition-width relative flex h-full w-full flex-1 flex-col items-stretch overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col items-center text-xs">
            <div className="justify-left flex w-full w-full flex-row items-center justify-between gap-1 bg-neutral-50 p-3 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
              <div className="mx-3 flex h-7 flex-row items-center px-2">
                <span className="gap-1 py-1 capitalize text-neutral-700 dark:text-neutral-500">
                  {`${model.creator || getEntityName(model.author)}`}
                </span>
                <span className="pl-2">/</span>
                <span className="items-center truncate truncate px-2 dark:text-neutral-300">
                  {model.name}
                </span>
              </div>
              <div>
                <Button variant="secondary" className="mr-4" onClick={() => onChange()}>
                  {local ? t('Uninstall') : t('Install')}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex h-full w-full flex-col text-sm dark:bg-neutral-900">
            <div className="flex h-[90%] w-full flex-col overflow-y-auto overflow-x-hidden">
              <div className="flex w-full flex-col px-8 py-4 text-sm">
                <h1 className="items-right bold w-full text-xl">{model.title || model.name}</h1>
                <div className="flex w-full flex-col items-center gap-2 text-sm">
                  <Parameter
                    title=""
                    name="description"
                    value={t(model.description || '')}
                    disabled
                    type="large-text"
                  />
                  {model.path && (
                    <Parameter
                      title={t('File')}
                      name="file"
                      value={`${model.path || ''}/${model.fileName || ''}`}
                      disabled
                      type="text"
                    />
                  )}
                  <Parameter
                    title={t('Author')}
                    name="version"
                    value={`${getEntityName(model.author)}`}
                    disabled
                    type="text"
                  />
                  <Parameter
                    title={t('Version')}
                    name="version"
                    value={`${model.version}`}
                    disabled
                    type="text"
                  />
                  <Parameter
                    title={t('License')}
                    name="license"
                    value={`${getEntityName(model.license)}`}
                    disabled
                    type="text"
                  />
                  <Parameter
                    title={t('Repository')}
                    name="url"
                    value={`${getResourceUrl(model.repository)}`}
                    disabled
                    type="url"
                  />
                </div>
                {downloads.length > 0 && (
                  <div className="flex w-full flex-col text-sm">
                    <p className="py-4">{t('Downloadable implementations')}</p>
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('File')}</TableHead>
                          <TableHead>{t('Size')}</TableHead>
                          <TableHead>{t('Description')}</TableHead>
                          <TableHead>{t('Action')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {downloads.map((download) => (
                          <TableRow
                            onClick={() => {}}
                            key={download.id || download.name}
                            className="hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          >
                            <TableCell className="truncate">{download.name}</TableCell>
                            <TableCell className="truncate">
                              <span>{`${(download.size || 0).toFixed(1)}Gb`}</span>
                            </TableCell>
                            <TableCell className="truncate">
                              <span>{download.recommendations || ''}</span>
                            </TableCell>
                            <TableCell aria-label={t('Download')}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onChange(download)}
                              >
                                <DownloadIcon />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelView;
