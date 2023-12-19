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

import useBackend from '@/hooks/useBackend';
import useTranslation from '@/hooks/useTranslation';
import Parameter from '../common/Parameter';

function Model({ modelId }: { modelId?: string }) {
  const { backendContext } = useBackend();
  const { t } = useTranslation();

  const models = backendContext.config.models.items; // .concat(localModels);
  const model = models.find((m) => m.id === modelId);

  return (
    <div className="flex max-w-full flex-1 flex-col dark:bg-neutral-800/30">
      <div className="transition-width relative flex h-full w-full flex-1 flex-col items-stretch overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col items-center text-xs">
            <div className="justify-left flex w-full flex-row items-center gap-1 bg-neutral-50 p-3 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
              <div className="mx-3 flex h-7 flex-row items-center px-2">
                <span className="gap-1 py-1 capitalize text-neutral-700 dark:text-neutral-500">
                  {model?.author}
                </span>
                <span className="pl-3"> /</span>
                <span className="items-center truncate truncate px-3 dark:text-neutral-300">
                  {model?.name}
                </span>
              </div>
            </div>
          </div>
          <div className="flex h-full flex-col items-center text-sm dark:bg-neutral-900">
            <div className="flex flex-col items-center gap-2 px-8 py-4 text-sm">
              <Parameter
                title=""
                name="description"
                value={t(model?.description || '')}
                disabled
                type="large-text"
              />
              <Parameter
                title={t('File')}
                name="file"
                value={model ? `${model.path}/${model.fileName}` : ''}
                disabled
                type="text"
              />
              <Parameter
                title={t('Author')}
                name="version"
                value={model?.author || ''}
                disabled
                type="text"
              />
              <Parameter
                title={t('Version')}
                name="version"
                value={model?.version || ''}
                disabled
                type="text"
              />
              <Parameter
                title={t('License')}
                name="license"
                value={model?.license || ''}
                disabled
                type="text"
              />
              <Parameter title={t('Url')} name="url" value={model?.url || ''} disabled type="url" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Model;
