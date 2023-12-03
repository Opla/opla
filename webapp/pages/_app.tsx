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

import { useCallback, useEffect, useState } from 'react';
import { AppProps } from 'next/app';
import Layout from '@/components/Layout';
import { ThemeProvider } from 'next-themes';
import { AppContextProvider } from '@/context';
import SettingsModal from '@/modals';
import Dialog from '@/components/Dialog';
import { ModalsProvider } from '../utils/modalsProvider';

export default function App({ Component }: AppProps) {
  const [settingTab, setSettingTab] = useState<string>();

  const onModalsInit = useCallback(
    ({ registerModal }: { registerModal: any }) => {
      registerModal('settings', ({ visible = false, onClose = () => {} }) => (
        <SettingsModal
          key="settings"
          open={visible}
          settingTab={settingTab}
          onTabChanged={setSettingTab}
          onClose={onClose}
        />
      ));

      registerModal(
        'welcome',
        ({ visible = false, onClose = () => {} }) => (
          <Dialog
            key="welcome"
            title="Welcome to Opla"
            actions={[{ label: 'Ok' }, { label: 'Cancel' }]}
            visible={visible}
            onClose={onClose}
          >
            <div>An open-source app</div>
          </Dialog>
        ),
        true,
      );
    },
    [/* isModalOpen, onModalClose, */ settingTab],
  );

  // Dirty hack to fix hydration mismatch using i18n
  const [initialRenderComplete, setInitialRenderComplete] = useState<boolean>(false);
  useEffect(() => {
    setInitialRenderComplete(true);
  }, []);
  if (!initialRenderComplete) return <div />;
  // End of dirty hack...

  return (
    <ThemeProvider attribute="class">
      <AppContextProvider>
        <ModalsProvider onInit={onModalsInit}>
          <Layout>
            <Component />
          </Layout>
        </ModalsProvider>
      </AppContextProvider>
    </ThemeProvider>
  );
}
