// Copyright 2023 mik
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
import { BiSolidCircle } from 'react-icons/bi';
import { AppContext } from '@/context';
import useTranslation from '@/hooks/useTranslation';
import Parameter from './Parameter';

function Provider({ providerId }: { providerId?: string }) {
  const { providers } = useContext(AppContext);
  const { t } = useTranslation();
  const initialProvider = providers.find((c) => c.id === providerId);
  return (
    <div className="flex max-w-full flex-1 flex-col dark:bg-gray-900">
      <div className="transition-width relative flex h-full w-full flex-1 flex-col items-stretch overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col items-center text-sm">
            <div className="flex w-full flex-row items-center justify-between gap-1 bg-gray-50 p-3 text-gray-500 dark:bg-gray-950 dark:text-gray-300">
              <div className="mx-3 flex h-7 flex-row items-center  px-2">
                <span className="gap-1 py-1 capitalize text-gray-700 dark:text-gray-500">
                  {initialProvider?.type}
                </span>
                <span className="items-center truncate truncate px-3 dark:text-gray-300">
                  {initialProvider?.name}
                </span>
              </div>
              <div className="flex flex-grow flex-row-reverse items-center gap-4">
                <button
                  type="button"
                  className="flex flex-row items-center gap-4 rounded-md border border-gray-600 p-2"
                >
                  <span>{initialProvider?.disabled ? t('Enable') : t('Disable')}</span>
                  <span
                    className={`${initialProvider?.disabled ? 'text-red-500' : 'text-green-500'} `}
                  >
                    <BiSolidCircle />
                  </span>
                </button>
                <button type="button" className="rounded-md border border-gray-600 p-2">
                  {t('Save')}
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 text-sm dark:bg-gray-900">
            <Parameter title={t('Name')} value={initialProvider?.name} type="text" />
            <Parameter title={t('Url')} value={initialProvider?.url} type="text" />
            <Parameter title={t('Token')} value={initialProvider?.token} type="text" />
            <Parameter title={t('Documentation')} value={initialProvider?.docUrl} type="text" />
            <Parameter title={t('Disabled')} value={initialProvider?.disabled} type="switch" />
            <Parameter
              title={t('Description')}
              value={initialProvider?.description}
              type="large-text"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Provider;
