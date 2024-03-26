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

import React from 'react';
import useTranslation from '@/hooks/useTranslation';
import { DownloadModel } from '@/components/views/Models';
import AlertDialog from '@/components/common/AlertDialog';
import { Model } from '@/types';

function DownloadModelDialog({
  id,
  open,
  data,
  onClose,
}: {
  id: string;
  open: boolean;
  data: any;
  onClose: () => void | undefined;
}) {
  const { t } = useTranslation();
  const model: Model = data?.item as Model;
  const handleAction = (action: string) => {
    if (action === 'Stop') {
      console.log('Stop');
    } else if (action === 'Cancel') {
      onClose();
    }
  };

  return (
    <AlertDialog
      id={id}
      title={`${t('Downloading')} ${model.title || model.name}`}
      actions={[
        { label: t('Stop'), value: 'Stop' },
        { label: t('Cancel'), value: 'Cancel' },
      ]}
      visible={open}
      onClose={onClose}
      onAction={handleAction}
    >
      <DownloadModel model={model} onClose={onClose} />
    </AlertDialog>
  );
}

export default DownloadModelDialog;
