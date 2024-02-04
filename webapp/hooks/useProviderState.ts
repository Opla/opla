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

import { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '@/context';
import logger from '@/utils/logger';
import { Provider, ProviderType, ServerConfiguration, ServerStatus } from '@/types';
import { deepMerge, deepSet } from '@/utils/data';
import { updateProvider } from '@/utils/data/providers';
import { ParameterValue } from '@/components/common/Parameter';
import useBackend from './useBackendContext';

const useProviderState = (providerId?: string, newProvider?: Provider) => {
  const [updatedProvider, setUpdatedProvider] = useState<Partial<Provider>>({ id: providerId });
  const { providers, setProviders } = useContext(AppContext);

  const { backendContext, restart, start, stop } = useBackend();

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
    if (!p && newProvider) {
      p = deepMerge(newProvider, updatedProvider, true);
    } else if (p && hasParametersChanged) {
      p = deepMerge(p, updatedProvider);
    }
    if (p?.type === ProviderType.opla) {
      p.disabled = backendContext.server.status === ServerStatus.STOPPED;
    }
    return p;
  }, [backendContext, hasParametersChanged, providerId, providers, updatedProvider, newProvider]);

  const onParameterChange = (name: string, value: ParameterValue) => {
    const mergedProvider = deepSet(updatedProvider, name, value);
    logger.info('onParameterChange', name, value, mergedProvider);
    setUpdatedProvider(mergedProvider);
  };

  const onParametersSave = (partialProvider: Partial<Provider> = {}) => {
    const mergedProvider = deepMerge(provider, partialProvider);
    const newProviders = updateProvider(mergedProvider, providers);
    logger.info('onParametersSave', mergedProvider, newProviders);
    setProviders(newProviders);
    setUpdatedProvider({ id: providerId });
    if (mergedProvider.type === ProviderType.opla) {
      const server: ServerConfiguration = mergedProvider.metadata?.server as ServerConfiguration;
      const parameters = server?.parameters; // deepCopy(provider?.metadata?.parameters);
      logger.info('params', parameters);
      restart(parameters);
    }
  };

  const onProviderToggle = () => {
    logger.info('onProviderToggle');
    if (provider?.type === ProviderType.opla) {
      logger.info('backend.server', backendContext.server);
      if (backendContext.server.status === ServerStatus.STARTED) {
        stop();
      } else if (backendContext.server.status === ServerStatus.STOPPED) {
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

  return { provider, hasParametersChanged, onParameterChange, onParametersSave, onProviderToggle };
};

export default useProviderState;
