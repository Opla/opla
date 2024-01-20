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

import useTranslation from '@/hooks/useTranslation';
import useBackend from '@/hooks/useBackendContext';
import useProviderState from '@/hooks/useProviderState';
import Toolbar from './Toolbar';
import Server from './server';
import OpenAI from './openai';
import Opla from './opla';
import OplaActions from './opla/Actions';

function ProviderConfiguration({ providerId }: { providerId?: string }) {
  const { t } = useTranslation();

  const { provider, hasParametersChanged, onParametersSave, onParameterChange, onProviderToggle } =
    useProviderState(providerId);
  const { backendContext } = useBackend();

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
              <div className="h-full w-full p-8 pb-24">
                {provider.type === 'opla' && (
                  <Opla provider={provider} onParameterChange={onParameterChange} />
                )}
                {provider.type === 'openai' && (
                  <OpenAI
                    className="h-full w-full"
                    provider={provider}
                    onParameterChange={onParameterChange}
                  />
                )}
                {provider.type === 'server' && (
                  <Server provider={provider} onParameterChange={onParameterChange} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProviderConfiguration;
