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

import { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '@/context';
import useTranslation from '@/hooks/useTranslation';
import { Provider, ServerConfiguration, ServerStatus } from '@/types';
import { updateProvider } from '@/utils/data/providers';
import logger from '@/utils/logger';
import { deepMerge, deepSet } from '@/utils/data';
import useBackend from '@/hooks/useBackend';
import Toolbar from './Toolbar';
import Server from './server';
import OpenAI from './openai';
import Opla from './opla';
import OplaActions from './opla/Actions';

function ProviderConfiguration({ providerId }: { providerId?: string }) {
  const [updatedProvider, setUpdatedProvider] = useState<Partial<Provider>>({ id: providerId });
  const { providers, setProviders } = useContext(AppContext);
  const { t } = useTranslation();

  const { getBackendContext, restart, start, stop } = useBackend();

  useEffect(() => {
    if (providerId !== updatedProvider.id) {
      setUpdatedProvider({ id: providerId });
    }
  }, [providerId, updatedProvider.id]);

  const hasParametersChanged = useMemo(
    () => Object.keys(updatedProvider).length > 1,
    [updatedProvider],
  );

  const provider = useMemo(() => {
    let p = providers.find((c) => c.id === providerId);
    if (p && hasParametersChanged) {
      p = deepMerge(p, updatedProvider);
    }
    if (p?.type === 'opla') {
      p.disabled = getBackendContext().server.status === ServerStatus.STOPPED;
    }
    return p;
  }, [getBackendContext, hasParametersChanged, providerId, providers, updatedProvider]);

  const onParameterChange = (name: string, value: string | number | boolean) => {
    const newProvider = deepSet(updatedProvider, name, value);
    logger.info('onParameterChange', name, value, newProvider);
    setUpdatedProvider(newProvider);
  };

  const onParametersSave = () => {
    logger.info('onParametersSave', provider);
    const newProviders = updateProvider(provider as Provider, providers);
    setProviders(newProviders);
    setUpdatedProvider({ id: providerId });
    if (provider?.type === 'opla') {
      const server: ServerConfiguration = provider?.metadata?.server as ServerConfiguration;
      const parameters = server?.parameters; // deepCopy(provider?.metadata?.parameters);
      logger.info('params', parameters);
      restart(parameters);
    }
  };

  const onProviderToggle = () => {
    logger.info('onProviderToggle');
    if (provider?.type === 'opla') {
      logger.info('backend.server', getBackendContext().server);
      if (getBackendContext().server.status === ServerStatus.STARTED) {
        stop();
      } else if (getBackendContext().server.status === ServerStatus.STOPPED) {
        const server: any = provider?.metadata?.server;
        const parameters = server?.parameters;
        start(parameters);
      }
    } else {
      const newProviders = updateProvider(
        { ...(provider as Provider), disabled: !provider?.disabled },
        providers,
      );
      setProviders(newProviders);
    }
  };

  const backendContext = getBackendContext();

  return (
    <div className="flex h-full max-w-full flex-col dark:bg-neutral-800/30">
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
                actions={
                  provider.type === 'opla' && (
                    <OplaActions
                      onProviderToggle={onProviderToggle}
                      provider={provider}
                      backend={backendContext}
                    />
                  )
                }
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
