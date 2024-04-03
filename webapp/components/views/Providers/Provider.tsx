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
import { ProviderType, ServerStatus } from '@/types';
import ContentView from '@/components/common/ContentView';
import CopyToClipBoard from '@/components/common/CopyToClipBoard';
import Toolbar from './Toolbar';
import Server from './server';
import OpenAI from './openai';
import Opla from './opla';
import OplaActions from './opla/Actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ScrollArea } from '../../ui/scroll-area';

type ProviderViewProps = {
  selectedId?: string;
};

function ProviderView({ selectedId: selectedProviderId }: ProviderViewProps) {
  const { t } = useTranslation();

  const { provider, hasParametersChanged, onParametersSave, onParameterChange, onProviderToggle } =
    useProviderState(selectedProviderId);
  const { backendContext } = useBackend();

  const buildLogs = () => {
    let logs = '';
    if (!provider || provider.type === ProviderType.opla) {
      logs = backendContext?.server.stderr?.join('\n') || '';
      logs += backendContext?.server.stdout?.join('\n') || '';
    } else {
      logs = provider?.errors?.join('\n') || '';
    }
    return logs;
  };

  return (
    <Tabs defaultValue="settings" className="h-full">
      <ContentView
        header={
          provider ? (
            <div className="flex flex-row items-center gap-4">
              <TabsList className="gap-4">
                <TabsTrigger value="settings">
                  <Settings2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {t('Settings')}
                </TabsTrigger>
                <TabsTrigger value="debug">
                  <Bug className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {t('Logs')}
                </TabsTrigger>
              </TabsList>
              <div>{provider.name}</div>
            </div>
          ) : (
            t('Provider')
          )
        }
        selectedId={selectedProviderId}
        toolbar={
          provider && (
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
          )
        }
      >
        <>
          <TabsContent value="settings" className="h-full p-4">
            {provider && (
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
            )}
          </TabsContent>
          <TabsContent value="debug" className="h-full w-full p-4">
            <div className="flex w-full flex-row-reverse">
              <CopyToClipBoard title={t('Copy logs to clipboard')} text={buildLogs()} />
            </div>
            {provider && (
              <ScrollArea>
                {provider.type === ProviderType.opla && (
                  <>
                    {backendContext?.server.status === ServerStatus.ERROR && (
                      <div className="w-full text-sm">
                        <div className="break-all pb-2 text-red-400 dark:text-red-600">
                          {t('Server Error')} : {backendContext?.server.message}
                        </div>
                      </div>
                    )}
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
                          <div key={log.id} className="break-all text-red-400 dark:text-red-600">
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
                        <div key={log.id} className="break-all text-red-400 dark:text-red-600">
                          {log.log}
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </TabsContent>
        </>
      </ContentView>
    </Tabs>
  );
}

export default ProviderView;
