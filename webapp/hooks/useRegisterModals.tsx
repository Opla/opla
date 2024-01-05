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

import { useContext, useEffect, useRef } from 'react';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/utils/modalsProvider';
import SettingsModal from '@/modals';
import { BaseNamedRecord } from '@/types';
import NewProvider from '@/modals/templates/NewProvider';
import AlertDialog from '@/components/common/AlertDialog';

const useRegisterModals = () => {
  const { t } = useTranslation();
  const { registerModal } = useContext(ModalsContext);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      registerModal('settings', ({ visible = false, onClose = () => {} }) => (
        <SettingsModal key="settings" open={visible} onClose={onClose} />
      ));

      registerModal('newprovider', ({ visible = false, onClose = () => {} }) => (
        <NewProvider key="newprovider" open={visible} onClose={onClose} />
      ));

      registerModal(
        'welcome',
        ({ visible = false, onClose = () => {} }) => (
          <AlertDialog
            key="welcome"
            id="welcome"
            title={t('Welcome to Opla!')}
            actions={[{ label: t("Let's go!") }]}
            visible={visible}
            onClose={onClose}
          >
            <div>{t('The ultimate Open-source generative AI App')} </div>
          </AlertDialog>
        ),
        true,
      );

      registerModal(
        'deleteitem',
        ({ visible = false, onClose = () => {}, data = undefined }) => {
          const dataItem = data as unknown as { item: BaseNamedRecord };
          const item = dataItem?.item as BaseNamedRecord;
          return (
            <AlertDialog
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
            </AlertDialog>
          );
        },
        false,
      );
    }
  }, [registerModal, t]);
};

export default useRegisterModals;
