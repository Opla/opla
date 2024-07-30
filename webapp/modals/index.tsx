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

import useTranslation from '@/hooks/useTranslation';
import Dialog from '@/components/common/Modal';
import AlertDialog from '@/components/common/AlertDialog';
import { BaseNamedRecord } from '@/types';
import { ShortcutSettings } from '@/components/common/ShortCut';
import { ModalIds } from '@/types/ui';
import EditTargetDialog from '@/features/Assistants/EditTargetDialog';
import { ModalData, ModalRef } from './context';
import SettingsPanel from './settings';
import NewProviderDialog from './templates/NewProvider';
import OpenAIDialog from './openai';
import NewLocalModelDialog from './models';
import NewPresetDialog from './presets';
import DownloadsDialog from './downloads';
import CloudModelDialog from './models/CloudDialog';
import InspectorModelDialog from './models/InspectorDialog';

const Modals: ModalRef[] = [
  {
    id: ModalIds.Settings,
    Component: function SettingsDialog({ visible, onClose }) {
      return (
        <Dialog
          key={ModalIds.Settings}
          id={ModalIds.Settings}
          size="xl"
          open={visible}
          onClose={onClose}
        >
          <SettingsPanel />
        </Dialog>
      );
    },
  },
  {
    id: ModalIds.Shortcuts,
    Component: function ShortcutsDialog({ visible, onClose }) {
      return (
        <Dialog
          key={ModalIds.Shortcuts}
          id={ModalIds.Shortcuts}
          size="lg"
          open={visible}
          onClose={onClose}
        >
          <ShortcutSettings />
        </Dialog>
      );
    },
  },
  {
    id: ModalIds.NewProvider,
    Component: function NPDialog({ visible, onClose }) {
      return (
        <NewProviderDialog
          key={ModalIds.NewProvider}
          id={ModalIds.NewProvider}
          open={visible}
          onClose={onClose}
        />
      );
    },
  },
  {
    id: ModalIds.NewLocalModel,
    Component: function NLMDialog({ visible, onClose }) {
      return (
        <NewLocalModelDialog
          key={ModalIds.NewLocalModel}
          id={ModalIds.NewLocalModel}
          open={visible}
          onClose={onClose}
        />
      );
    },
  },
  {
    id: ModalIds.Welcome,
    Component: function WelcomeDialog({ visible, onClose }) {
      const { t } = useTranslation();
      return (
        <AlertDialog
          key={ModalIds.Welcome}
          id={ModalIds.Welcome}
          title={t('Welcome to Opla!')}
          actions={[{ label: t("Let's go!") }]}
          visible={visible}
          onClose={onClose}
        >
          <div>{t('The ultimate Open-source generative AI App')} </div>
        </AlertDialog>
      );
    },
  },
  {
    id: ModalIds.OpenAI,
    Component: function OAIDialog({ visible, onClose, data }) {
      return (
        <OpenAIDialog
          key={ModalIds.OpenAI}
          id={ModalIds.OpenAI}
          open={visible}
          data={data as ModalData}
          onClose={onClose}
        />
      );
    },
  },
  {
    id: ModalIds.CloudModels,
    Component: function CMDialog({ visible, onClose, data }) {
      return (
        <CloudModelDialog
          key={ModalIds.CloudModels}
          id={ModalIds.CloudModels}
          open={visible}
          data={data as ModalData}
          onClose={onClose}
        />
      );
    },
  },
  {
    id: ModalIds.InspectModel,
    Component: function IMDialog({ visible, onClose, data }) {
      return (
        <InspectorModelDialog
          key={ModalIds.InspectModel}
          id={ModalIds.InspectModel}
          open={visible}
          data={data as ModalData}
          onClose={onClose}
        />
      );
    },
  },
  {
    id: ModalIds.DeleteItem,
    Component: function DeleteItemDialog({ visible, onClose, data }) {
      const { t } = useTranslation();
      const item = data?.item as BaseNamedRecord;
      return (
        <AlertDialog
          key={ModalIds.DeleteItem}
          id={ModalIds.DeleteItem}
          title={t(data?.title || 'Delete this item?')}
          actions={[
            { label: t('Delete'), value: 'Delete' },
            { label: t('Cancel'), value: 'Cancel' },
          ]}
          visible={visible}
          onClose={onClose}
          data={data}
        >
          <div>{data?.description || item?.name || ''}</div>
        </AlertDialog>
      );
    },
  },
  {
    id: ModalIds.DownloadItem,
    Component: function DownloadItemDialog({ visible, onClose, data }) {
      const { t } = useTranslation();
      const item = data?.item as BaseNamedRecord;
      return (
        <AlertDialog
          key={ModalIds.DownloadItem}
          id={ModalIds.DownloadItem}
          title={t('Download this item?')}
          actions={[
            { label: t('Download'), value: 'Download' },
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
  },
  {
    id: ModalIds.NewPreset,
    Component: function NPDialog({ visible, onClose, data }) {
      return (
        <NewPresetDialog
          key={ModalIds.NewPreset}
          id={ModalIds.NewPreset}
          visible={visible}
          onClose={onClose}
          data={data as ModalData}
        />
      );
    },
  },
  {
    id: ModalIds.EditTarget,
    Component: function ETDialog({ visible, onClose, data }) {
      return (
        <EditTargetDialog
          key={ModalIds.EditTarget}
          id={ModalIds.EditTarget}
          visible={visible}
          onClose={onClose}
          data={data}
        />
      );
    },
  },
  {
    id: ModalIds.Downloads,
    Component: function DMDialog({ visible, onClose, data }) {
      return (
        <DownloadsDialog
          key={ModalIds.Downloads}
          id={ModalIds.Downloads}
          open={visible}
          onClose={onClose}
          data={data}
        />
      );
    },
  },
];

export default Modals;

export { ModalIds };
