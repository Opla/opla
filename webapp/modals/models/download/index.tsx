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

import React, { useEffect } from 'react';
import useTranslation from '@/hooks/useTranslation';
import useBackend from '@/hooks/useBackendContext';
import { DownloadModel } from '@/components/views/Models';
import AlertDialog from '@/components/common/AlertDialog';
import { Model } from '@/types';
import logger from '@/utils/logger';
import { cancelDownloadModel } from '@/utils/backend/commands';

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
  const { backendContext } = useBackend();
  const model: Model = data?.item as Model;
  const download = (backendContext.downloads ?? [undefined])[0];

  useEffect(() => {}, [download, onClose]);

  const handleAction = async (action: string) => {
    if (action === 'Cancel') {
      logger.info(`Cancel download model.id=${model.id}`);
      await cancelDownloadModel(data.item.id);
      // onClose();
    }
  };

  return (
    <AlertDialog
      id={id}
      title={`${t('Downloading')} ${model.title || model.name}`}
      actions={
        download
          ? [{ label: t('Cancel'), value: 'Cancel' }]
          : [{ label: t('Close'), value: 'Close' }]
      }
      visible={open}
      onClose={onClose}
      onAction={handleAction}
    >
      <DownloadModel model={model} download={download} />
    </AlertDialog>
  );
}

export default DownloadModelDialog;
