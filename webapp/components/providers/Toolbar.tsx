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

import { BiSolidCircle } from 'react-icons/bi';
import useTranslation from '@/hooks/useTranslation';
import { Provider } from '@/types';

export default function Toolbar({
  provider,
  onProviderToggle,
  onParametersSave,
  hasParametersChanged,
}: {
  provider: Provider;
  onProviderToggle: () => void;
  onParametersSave: () => void;
  hasParametersChanged: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center text-sm">
      <div className="flex w-full flex-row items-center justify-between gap-1 bg-gray-50 p-3 text-gray-500 dark:bg-gray-950 dark:text-gray-300">
        <div className="mx-3 flex h-7 flex-row items-center  px-2">
          {provider?.type.toLowerCase() !== provider?.name.toLowerCase() && (
            <span className="gap-1 py-1 capitalize text-gray-700 dark:text-gray-500">
              {provider?.type}
            </span>
          )}
          <span className="items-center truncate truncate px-3 dark:text-gray-300">
            {provider?.name}
          </span>
        </div>
        <div className="flex flex-grow flex-row-reverse items-center gap-4">
          <button
            type="button"
            className="flex flex-row items-center gap-4 rounded-md border border-gray-600 p-2"
            onClick={(e) => {
              e.preventDefault();
              onProviderToggle();
            }}
          >
            <span>{provider?.disabled ? t('Enable') : t('Disable')}</span>
            <span className={`${provider?.disabled ? 'text-red-500' : 'text-green-500'} `}>
              <BiSolidCircle />
            </span>
          </button>
          <button
            disabled={!hasParametersChanged}
            type="button"
            className="rounded-md border border-gray-600 p-2 disabled:opacity-50"
            onClick={(e) => {
              e.preventDefault();
              onParametersSave();
            }}
          >
            {t('Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
