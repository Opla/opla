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

import { Bug, Settings2 } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import useBackend from '@/hooks/useBackendContext';
import useProviderState from '@/hooks/useProviderState';
import { ProviderType } from '@/types';
import Toolbar from './Toolbar';
import Server from './server';
import OpenAI from './openai';
import Opla from './opla';
import OplaActions from './opla/Actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';

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
                  provider.type === ProviderType.opla && (
                    <OplaActions
                      onProviderToggle={onProviderToggle}
                      provider={provider}
                      backend={backendContext}
                    />
                  )
                }
              />
              <div className="h-full w-full">
                <Tabs defaultValue="settings" className="w-full py-3">
                  <div className="px-4">
                    <TabsList className="gap-4">
                      <TabsTrigger value="settings">
                        <Settings2 className="mr-2 h-4 w-4" />
                        {t('Settings')}
                      </TabsTrigger>
                      <TabsTrigger value="debug">
                        <Bug className="mr-2 h-4 w-4" />
                        {t('Logs')}
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="settings" className="h-full p-4">
                    <ScrollArea className="h-full">
                      {provider.type === ProviderType.opla && (
                        <Opla provider={provider} onParameterChange={onParameterChange} />
                      )}
                      {provider.type === ProviderType.openai && (
                        <OpenAI
                          className="h-full w-full"
                          provider={provider}
                          onParameterChange={onParameterChange}
                        />
                      )}
                      {provider.type === ProviderType.server && (
                        <Server provider={provider} onParameterChange={onParameterChange} />
                      )}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="debug" className="h-full w-full p-4">
                    <ScrollArea>
                      {provider.type === ProviderType.opla && (
                        <>
                          <div className="w-full text-sm">
                            {backendContext?.server.stdout
                              ?.map((log, index) => ({ id: index, log }))
                              .map((log) => (
                                <div
                                  key={log.id}
                                  className="break-all pb-2 text-neutral-400 dark:text-neutral-600"
                                >
                                  {log.log}
                                </div>
                              ))}
                          </div>
                          <div>
                            {backendContext?.server.stderr
                              ?.map((log, index) => ({ id: index, log }))
                              .map((log) => (
                                <div
                                  key={log.id}
                                  className="break-all text-red-400 dark:text-red-600"
                                >
                                  {log.log}
                                </div>
                              ))}
                          </div>
                        </>
                      )}
                      {provider.type !== ProviderType.opla && (
                        <div className="w-full text-sm">
                          {provider.errors
                            ?.map((log, index) => ({ id: index, log }))
                            .map((log) => (
                              <div
                                key={log.id}
                                className="break-all text-red-400 dark:text-red-600"
                              >
                                {log.log}
                              </div>
                            ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProviderConfiguration;
