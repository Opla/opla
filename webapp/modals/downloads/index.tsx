// Copyright 2024 Mik Bry
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
import { useRouter } from 'next/router';
import useTranslation from '@/hooks/useTranslation';
import useBackend from '@/hooks/useBackendContext';
import { DownloadModel } from '@/components/views/Models';
import AlertDialog from '@/components/common/AlertDialog';
import { Model } from '@/types';
import logger from '@/utils/logger';
import { cancelDownloadModel } from '@/utils/backend/commands';
import { Page } from '@/types/ui';

function DownloadsDialog({
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
  const router = useRouter();
  const { pathname } = router;
  const { t } = useTranslation();
  const { downloads, updateBackendStore } = useBackend();
  const model: Model = data?.item as Model;
  const download = (downloads ?? [undefined])[0];

  useEffect(() => {}, [download, onClose]);

  const handleAction = async (action: string) => {
    if (action === 'Cancel') {
      logger.info(`Cancel download model.id=${model.id}`);
      await cancelDownloadModel(data.item.id);
      await updateBackendStore();
      if (pathname.startsWith(Page.Models)) {
        router.push(Page.Models);
      }
    } else if (action === 'Close') {
      onClose();
    }
  };

  return (
    <AlertDialog
      id={id}
      title={t('Downloads')}
      visible={open}
      onClose={onClose}
      onAction={handleAction}
    >
      <DownloadModel download={download} onAction={handleAction} />
    </AlertDialog>
  );
}

export default DownloadsDialog;
