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

import { useEffect, useMemo, useState } from 'react';
import { CloudDownload, File, Search, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Download, ModelState } from '@/types';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/utils/download';
import { Separator } from '@/components/ui/separator';
import useTranslation from '@/hooks/useTranslation';
import useBackend from '@/hooks/useBackendContext';
import { Button } from '@/components/ui/button';
import { findModel, getModelStateAsString } from '@/utils/data/models';
import EmptyView from '@/components/common/EmptyView';

type DownloadModelProps = {
  className?: string;
  download: Download | undefined;
  onAction: (action: string) => void;
};
function DownloadModel({ className, download, onAction }: DownloadModelProps) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState<boolean>(false);
  const { config, updateBackendStore } = useBackend();

  const model = useMemo(() => {
    let modelId = download?.id;
    const models = config.models.items ?? [undefined];
    if (!modelId) {
      modelId = models.find(
        (m) => m.state === ModelState.Pending || m.state === ModelState.Downloading,
      )?.id;
    }
    return findModel(modelId, models);
  }, [config, download]);

  useEffect(() => {
    const asyncFunc = async () => {
      if (downloading && !download && model?.state !== ModelState.Pending) {
        await updateBackendStore();
        onAction('Close');
        setDownloading(false);
      } else if (download) {
        setDownloading(true);
      }
    };
    asyncFunc();
  }, [download, model, onAction, downloading, updateBackendStore]);

  let state: 'downloading' | 'ok' | 'pending' | 'error';
  if (download && model?.state === ModelState.Downloading) {
    state = 'downloading';
  } else if (model?.state === ModelState.Ok) {
    state = 'ok';
  } else if (model?.state === ModelState.Error) {
    state = 'error';
  } else {
    state = 'pending';
  }
  if (!model) {
    return (
      <EmptyView
        title="No downloads"
        description=""
        icon={<CloudDownload />}
        className="h-full text-muted-foreground"
      />
    );
  }

  return (
    <div className={cn('flex flex-row items-center gap-3', className)}>
      <File className="h-12 w-12 p-2 text-primary" strokeWidth={1.5} />
      <div className="flex w-full flex-col gap-2">
        <p className="text-sm">{model?.name}</p>

        {(download || model?.state === ModelState.Downloading) && (
          <>
            <Progress value={download?.percentage ?? 0} className="w-full" />
            {download && (
              <div className="flex h-3 w-full items-center gap-2 text-xs tabular-nums text-muted-foreground">
                {formatFileSize(download.transfered)} {t('of')} {formatFileSize(download.fileSize)}{' '}
                <Separator orientation="vertical" className="bg-muted-foreground" />(
                {formatFileSize(download.transferRate)}/sec)
              </div>
            )}
            {!download && (
              <div className="flex h-3 w-full items-center gap-2 text-xs text-muted-foreground">
                {t('Starting...')}
              </div>
            )}
          </>
        )}
        {!download && model && (
          <div className="flex h-3 w-full items-center gap-2 text-xs text-muted-foreground">
            {t(getModelStateAsString(model))}{' '}
            <Separator orientation="vertical" className="bg-muted-foreground" />{' '}
            {formatFileSize(model?.size ?? 0)}
          </div>
        )}
      </div>
      {state !== 'pending' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (state === 'downloading') {
              onAction('Cancel');
            }
          }}
        >
          {state === 'downloading' && <X className="h-4 w-4" strokeWidth={1.5} />}
          {state === 'ok' && <Search className="h-4 w-4" strokeWidth={1.5} />}
          {state === 'error' && <TriangleAlert className="h-4 w-4 text-error" strokeWidth={1.5} />}
        </Button>
      )}
    </div>
  );
}

export default DownloadModel;
