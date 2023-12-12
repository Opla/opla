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

import { useContext, useEffect, useState } from 'react';
import { BiSolidCircle } from 'react-icons/bi';
import { AppContext } from '@/context';
import useTranslation from '@/hooks/useTranslation';
import { Provider } from '@/types';
import { updateProvider } from '@/utils/data/providers';
import logger from '@/utils/logger';
import Parameter from '../common/Parameter';

function ProviderConfiguration({ providerId }: { providerId?: string }) {
  const [updatedProvider, setUpdatedProvider] = useState<Partial<Provider>>({ id: providerId });
  const { providers, setProviders } = useContext(AppContext);
  const { t } = useTranslation();
  let provider = providers.find((c) => c.id === providerId);

  useEffect(() => {
    if (providerId !== updatedProvider.id) {
      setUpdatedProvider({ id: providerId });
    }
  }, [providerId, updatedProvider.id]);

  const hasParametersChanged = Object.keys(updatedProvider).length > 1;
  if (provider && hasParametersChanged) {
    provider = { ...provider, ...updatedProvider };
  }

  const onParameterChange = (name: string, value: string | boolean) => {
    const newProvider = { ...updatedProvider, [name]: value };
    logger.info('onParameterChange', name, value, newProvider);
    setUpdatedProvider(newProvider);
  };

  const onParametersSave = () => {
    logger.info('onParametersSave');
    const newProviders = updateProvider(provider as Provider, providers);
    setProviders(newProviders);
    setUpdatedProvider({ id: providerId });
  };

  const onProviderToggle = () => {
    logger.info('onProviderToggle');
    const newProviders = updateProvider(
      { ...(provider as Provider), disabled: !provider?.disabled },
      providers,
    );
    setProviders(newProviders);
  };

  return (
    <div className="flex max-w-full flex-1 flex-col dark:bg-gray-900">
      <div className="transition-width relative flex h-full w-full flex-1 flex-col items-stretch overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {!provider ? (
            <div className="text-md flex h-full flex-col items-center justify-center text-gray-300 dark:text-gray-700">
              {t('No provider selected')}
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-sm">
                <div className="flex w-full flex-row items-center justify-between gap-1 bg-gray-50 p-3 text-gray-500 dark:bg-gray-950 dark:text-gray-300">
                  <div className="mx-3 flex h-7 flex-row items-center  px-2">
                    <span className="gap-1 py-1 capitalize text-gray-700 dark:text-gray-500">
                      {provider?.type}
                    </span>
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
                      <span
                        className={`${provider?.disabled ? 'text-red-500' : 'text-green-500'} `}
                      >
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
              <div className="flex flex-col items-center gap-2 p-4 text-sm dark:bg-gray-900">
                <Parameter
                  title={t('Name')}
                  name="name"
                  value={provider?.name}
                  type="text"
                  onChange={onParameterChange}
                />
                <Parameter
                  title={t('Url')}
                  name="url"
                  value={provider?.url}
                  type="text"
                  onChange={onParameterChange}
                />
                <Parameter
                  title={t('Token')}
                  name="token"
                  value={provider?.token}
                  type="text"
                  onChange={onParameterChange}
                />
                <Parameter
                  title={t('Documentation')}
                  name="docUrl"
                  value={provider?.docUrl}
                  type="text"
                  onChange={onParameterChange}
                />
                <Parameter
                  title={t('Description')}
                  name="description"
                  value={provider?.description}
                  type="large-text"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProviderConfiguration;
