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

import { useContext, useEffect } from 'react';
import '@/app/globals.css';
import Sidebar from '@/components/common/Sidebar';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/utils/modalsProvider';
import SettingsModal from '@/modals';
import { BaseNamedRecord, Provider } from '@/types';
import NewProvider from '@/modals/templates/NewProvider';
import initBackend from '@/utils/backend';
import { AppContext } from '@/context';
import Dialog from './common/Dialog';
import Statusbar from './common/Statusbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { registerModal } = useContext(ModalsContext);
  const { providers } = useContext(AppContext);
  const opla = providers.find((p) => p.type === 'opla');
  useEffect(() => {
    if (opla) {
      initBackend(opla as Provider);
    }
  }, [opla]);

  useEffect(() => {
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
  }, [registerModal, t]);

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
