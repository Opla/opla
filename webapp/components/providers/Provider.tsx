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
import { AppContext } from '@/context';
import useTranslation from '@/hooks/useTranslation';
import { Provider } from '@/types';
import { updateProvider } from '@/utils/data/providers';
import logger from '@/utils/logger';
import { deepMerge, deepSet } from '@/utils/data';
import Toolbar from './Toolbar';
import Server from './server';
import OpenAI from './openai';
import Opla from './opla';

function ProviderConfiguration({ providerId }: { providerId?: string }) {
  const [updatedProvider, setUpdatedProvider] = useState<Partial<Provider>>({ id: providerId });
  const { providers, setProviders } = useContext(AppContext);
  const { t } = useTranslation();

  useEffect(() => {
    if (providerId !== updatedProvider.id) {
      setUpdatedProvider({ id: providerId });
    }
  }, [providerId, updatedProvider.id]);

  let provider = providers.find((c) => c.id === providerId);
  const hasParametersChanged = Object.keys(updatedProvider).length > 1;
  if (provider && hasParametersChanged) {
    provider = deepMerge(provider, updatedProvider);
  }

  const onParameterChange = (name: string, value: string | boolean) => {
    const newProvider = deepSet(updatedProvider, name, value);
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
    <div className="flex max-w-full flex-1 flex-col dark:bg-neutral-900">
      <div className="transition-width relative flex h-full w-full flex-1 flex-col items-stretch overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {!provider ? (
            <div className="text-md flex h-full flex-col items-center justify-center text-neutral-300 dark:text-neutral-700">
              {t('No provider selected')}
            </div>
          ) : (
            <>
              <Toolbar
                provider={provider}
                onProviderToggle={onProviderToggle}
                onParametersSave={onParametersSave}
                hasParametersChanged={hasParametersChanged}
              />
              {provider.type === 'opla' && (
                <Opla provider={provider} onParameterChange={onParameterChange} />
              )}
              {provider.type === 'api' && (
                <OpenAI provider={provider} onParameterChange={onParameterChange} />
              )}
              {provider.type === 'server' && (
                <Server provider={provider} onParameterChange={onParameterChange} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProviderConfiguration;
