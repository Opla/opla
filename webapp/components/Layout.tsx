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

import { useCallback, useContext, useEffect, useRef } from 'react';
import '@/app/globals.css';
import Sidebar from '@/components/common/Sidebar';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/utils/modalsProvider';
import SettingsModal from '@/modals';
import { BaseNamedRecord, Provider, ProviderType } from '@/types';
import NewProvider from '@/modals/templates/NewProvider';
import initBackend from '@/utils/backend';
import { AppContext } from '@/context';
import logger from '@/utils/logger';
import { createProvider } from '@/utils/data/providers';
import oplaProviderConfig from '@/utils/providers/opla/config.json';
import Dialog from './common/Dialog';
import Statusbar from './common/Statusbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { registerModal } = useContext(ModalsContext);
  const { backend, setBackend } = useContext(AppContext);
  const { providers, setProviders, models, presets } = useContext(AppContext);
  const firstRender = useRef(true);

  const enableOpla = useCallback(
    (disabled: boolean) => {
      const opla = providers.find((p) => p.type === 'opla');
      if (opla) {
        opla.disabled = disabled;
        const ps = providers.map((p) => (p.id === opla.id ? opla : p));
        console.log('enableOpla', ps, providers);
        setProviders(providers.map((p) => (p.id === opla.id ? opla : p)));
      }
    },
    [providers, setProviders],
  );

  const backendListener = useCallback(
    (event: any) => {
      logger.info('backend event', event);
      if (event.event === 'opla-server') {
        setBackend({
          ...backend,
          server: {
            ...backend.server,
            status: event.payload.status,
            message: event.payload.message,
          },
        });
        enableOpla(event.payload.status !== 'started');
      }
    },
    [backend, setBackend, enableOpla],
  );

  const startBackend = useCallback(async () => {
    let opla = providers.find((p) => p.type === 'opla') as Provider;
    if (!opla) {
      const config = { ...oplaProviderConfig, type: oplaProviderConfig.type as ProviderType };
      opla = createProvider('Opla', config);
      providers.splice(0, 0, opla);
    }
    const response: { payload: any } = await initBackend(opla as Provider, backendListener);
    logger.info('backend response', response);
    setBackend({
      ...backend,
      server: {
        ...backend.server,
        status: response.payload.status,
        message: response.payload.message,
        name: response.payload.message,
      },
    });
    enableOpla(response.payload.status !== 'started');
  }, [backend, backendListener, enableOpla, providers, setBackend]);

  useEffect(() => {
    if (firstRender.current && providers) {
      firstRender.current = false;
      startBackend();
      registerModal('settings', ({ visible = false, onClose = () => {} }) => (
        <SettingsModal key="settings" open={visible} onClose={onClose} />
      ));

      registerModal('newprovider', ({ visible = false, onClose = () => {} }) => (
        <NewProvider key="newprovider" open={visible} onClose={onClose} />
      ));

      registerModal(
        'welcome',
        ({ visible = false, onClose = () => {} }) => (
          <Dialog
            key="welcome"
            id="welcome"
            title={t('Welcome to Opla!')}
            actions={[{ label: t("Let's go!") }]}
            visible={visible}
            onClose={onClose}
          >
            <div>{t('The ultimate Open-source generative AI App')}</div>
          </Dialog>
        ),
        true,
      );

      registerModal(
        'deleteitem',
        ({ visible = false, onClose = () => {}, data = undefined }) => {
          const dataItem = data as unknown as { item: BaseNamedRecord };
          const item = dataItem?.item as BaseNamedRecord;
          return (
            <Dialog
              key="deleteitem"
              id="deleteitem"
              title={t('Delete this item?')}
              actions={[
                { label: t('Delete'), value: 'Delete' },
                { label: t('Cancel'), value: 'Cancel' },
              ]}
              visible={visible}
              onClose={onClose}
              data={data}
            >
              <div>{item?.name || ''}</div>
            </Dialog>
          );
        },
        false,
      );
    }
  }, [providers, registerModal, startBackend, t]);

  if (!providers || !models || !presets) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full select-none overflow-hidden">
      <Sidebar />
      <div className="flex h-full w-full flex-1 flex-col">
        {children}
        <Statusbar />
      </div>
    </div>
  );
}
