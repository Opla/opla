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
import { toast } from '@/components/ui/Toast';
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

  const handleParameterChange = (name: string, value: ParameterValue) => {
    const mergedProvider = deepSet<Provider, ParameterValue>(
      updatedProvider as Provider,
      name,
      value,
    );
    logger.info('handleParameterChange', name, value, mergedProvider);
    setUpdatedProvider(mergedProvider);
  };

  const handleParametersSave = (partialProvider: Partial<Provider> = {}) => {
    if (!provider) {
      return;
    }
    const mergedProvider = deepMerge<Provider>(provider, partialProvider);
    const newProviders = updateProvider(mergedProvider, providers);
    logger.info('handleParametersSave', mergedProvider, newProviders);
    setProviders(newProviders);
    setUpdatedProvider({ id: providerId });
    if (mergedProvider.type === ProviderType.opla) {
      const server: ServerConfiguration = mergedProvider.metadata?.server as ServerConfiguration;
      const parameters = server?.parameters; // deepCopy(provider?.metadata?.parameters);
      logger.info('params', parameters);
      restart(parameters);
    }
  };

  const handleProviderToggle = async () => {
    if (provider?.type === ProviderType.opla) {
      logger.info('backend.server', backendContext.server);
      if (
        backendContext.server.status === ServerStatus.STARTED ||
        backendContext.server.status === ServerStatus.STARTING
      ) {
        const result = await stop();
        if (result.status === 'error') {
          toast.error(`Error stopping server: ${result.error}`);
        }
      } else if (
        backendContext.server.status === ServerStatus.STOPPED ||
        backendContext.server.status === ServerStatus.ERROR
      ) {
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

  return {
    provider,
    hasParametersChanged,
    onParameterChange: handleParameterChange,
    onParametersSave: handleParametersSave,
    onProviderToggle: handleProviderToggle,
  };
};

export default useProviderState;
