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

import { DownloadIcon } from '@radix-ui/react-icons';
import useTranslation from '@/hooks/useTranslation';
import { Model } from '@/types';
import { getEntityName, getResourceUrl } from '@/utils/data';
import useParameters, { ParametersCallback } from '@/hooks/useParameters';
import ContentView from '@/components/common/ContentView';
import { ScrollArea } from '@/components/ui/scroll-area';
import Parameter from '../../common/Parameter';
import { Button } from '../../ui/button';
import { Table, TableBody, TableRow, TableCell, TableHeader, TableHead } from '../../ui/table';
import ModelInfos from '../../common/ModelInfos';

export type ModelViewProps = {
  model: Model;
  isDownloading: boolean;
  local: boolean;
  downloadables: Model[];
  onChange: (item?: Model) => void;
  onParametersChange: ParametersCallback;
};

function ModelView({
  model,
  isDownloading,
  local,
  downloadables,
  onChange,
  onParametersChange,
}: ModelViewProps) {
  const { t } = useTranslation();
  const [updatedParameters, setUpdatedParameters] = useParameters(model?.id, onParametersChange);

  if (!model) {
    return null;
  }

  return (
    <ContentView
      header={
        <div className="mx-3 flex h-7 grow flex-row items-center px-2">
          <span className="gap-1 py-1 capitalize text-neutral-700 dark:text-neutral-500">
            {`${model.creator || getEntityName(model.author)}`}
          </span>
          <span className="pl-2">/</span>
          <div className="flex grow items-center gap-2 truncate px-2 ">
            <span>{model.name}</span>
            <ModelInfos model={model} displayName={false} />
          </div>
        </div>
      }
      selectedId={model.id}
      toolbar={
        <div className="flex flex-row gap-2">
          <Button variant="secondary" className="" onClick={() => onChange()}>
            {isDownloading && t('Downloading...')}
            {!isDownloading && (local ? t('Uninstall') : t('Install'))}
          </Button>
          {/* local && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <PiDotsThreeVerticalBold className="h-4 w-4"  strokeWidth={1.5} />
          <span className="sr-only">{t('More')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <>
          <DropdownMenuItem onSelect={() => onChange()}>
            {t('Uninstall & Remove')}
          </DropdownMenuItem>
          <DropdownMenuItem>{t('Open in Finder')}</DropdownMenuItem>
          <DropdownMenuItem>{t('Change version')}</DropdownMenuItem>
        </>
      </DropdownMenuContent>
    </DropdownMenu>
  ) */}
        </div>
      }
    >
      <ScrollArea className="h-full px-8 py-4">
        <div className="flex w-full flex-col px-8 py-4 text-sm">
          <h1 className="items-right bold w-full text-xl">{model.title || model.name}</h1>
          <div className="flex w-full flex-col items-center gap-2 text-sm">
            <Parameter
              label=""
              name="description"
              value={updatedParameters?.description || t(model.description || '')}
              disabled={!model.editable}
              type="large-text"
              onChange={setUpdatedParameters}
            />
            {model.fileName && (
              <Parameter
                label={t('File')}
                name="file"
                value={`${model.path || ''}/${model.fileName || ''}`}
                disabled
                type="text"
              />
            )}
            {model.author && (
              <Parameter
                label={t('Author')}
                name="author"
                value={updatedParameters?.author || `${getEntityName(model.author)}`}
                disabled={!model.editable}
                type="text"
                onChange={setUpdatedParameters}
              />
            )}
            {getEntityName(model.creator).toLowerCase() !==
              getEntityName(model.author).toLowerCase() && (
              <Parameter
                label={t('Creator')}
                name="version"
                value={`${getEntityName(model.creator)}`}
                disabled={!model.editable}
                type="text"
              />
            )}
            {model.publisher &&
              getEntityName(model.publisher).toLowerCase() !==
                getEntityName(model.author).toLowerCase() &&
              getEntityName(model.publisher).toLowerCase() !==
                getEntityName(model.creator).toLowerCase() && (
                <Parameter
                  label={t('Publisher')}
                  name="version"
                  value={`${getEntityName(model.publisher)}`}
                  disabled={!model.editable}
                  type="text"
                />
              )}
            {model.version && (
              <Parameter
                label={t('Version')}
                name="version"
                value={`${model.version}`}
                disabled={!model.editable}
                type="text"
              />
            )}
            {model.license && (
              <Parameter
                label={t('License')}
                name="license"
                value={`${getEntityName(model.license)}`}
                disabled={!model.editable}
                type="text"
              />
            )}
            {model.repository && (
              <Parameter
                label={t('Repository')}
                name="url"
                value={`${getResourceUrl(model.repository)}`}
                disabled={!model.editable}
                type="url"
              />
            )}
          </div>
          {downloadables.length > 0 && (
            <div className="flex w-full flex-col text-sm">
              <p className="py-4">{t('Downloadable implementations')}</p>
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('File')}</TableHead>
                    {/* <TableHead>{t('Size')}</TableHead> */}
                    <TableHead>{t('Description')}</TableHead>
                    <TableHead>{t('Parameters')}</TableHead>
                    <TableHead>{t('Action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downloadables.map((download) => (
                    <TableRow
                      onClick={() => {}}
                      key={download.id || download.name}
                      className="hover:bg-secondary/10"
                    >
                      <TableCell className="truncate">{download.name}</TableCell>
                      {/* <TableCell className="truncate">
                              <span>{`${(download.size || 0).toFixed(1)}Gb`}</span>
                        </TableCell> */}
                      <TableCell className="truncate">
                        <span>{download.recommendations || ''}</span>
                      </TableCell>
                      <TableCell className="truncate">
                        <ModelInfos model={download} displayName={false} />
                      </TableCell>
                      <TableCell aria-label={t('Download')}>
                        <Button variant="ghost" size="icon" onClick={() => onChange(download)}>
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
      </ScrollArea>
    </ContentView>
  );
}

export default ModelView;
