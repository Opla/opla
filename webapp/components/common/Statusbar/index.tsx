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
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { DownloadCloud, AlertTriangle, Server, BarChart3, Cpu } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import useBackend from '@/hooks/useBackendContext';
// import logger from '@/utils/logger';
import { AppContext } from '@/context';
import { ModalIds, Page } from '@/types/ui';
import { cancelDownloadModel, getSys } from '@/utils/backend/commands';
import { Sys } from '@/types';
import { ModalsContext } from '@/context/modals';
import logger from '@/utils/logger';
import { findModel } from '@/utils/data/models';

export default function Statusbar() {
  const router = useRouter();
  const { t } = useTranslation();
  const { backendContext, getActiveModel } = useBackend();
  const { usage } = useContext(AppContext);
  const [sys, setSys] = useState<Sys>();
  const { showModal } = useContext(ModalsContext);

  useEffect(() => {
    const call = async () => {
      const s = await getSys();
      setSys(s);
    };
    call();
  }, [setSys]);

  const running = backendContext.server.status === 'started';
  const error = backendContext.server.status === 'error';

  const activeModel = getActiveModel();
  const model = findModel(activeModel, backendContext.config.models.items);
  const download = (backendContext.downloads ?? [undefined])[0];

  const displayServer = () => {
    router.push(Page.Providers);
  };

  const handleCancelDownload = async (action: string, data: any) => {
    logger.info(`Cancel download ${action} model.id=${data}`);
    await cancelDownloadModel(data.item.id);
  };

  const displayDownloads = () => {
    const id = download?.id;
    const downloadModel = findModel(id, backendContext.config.models.items);
    if (downloadModel) {
      showModal(ModalIds.DownloadModel, {
        item: downloadModel,
        onAction: handleCancelDownload,
      });
    } else if (id) {
      showModal(ModalIds.Downloads, {
        item: {
          id,
          createdAt: 0,
          updatedAt: 0,
        },
        onAction: handleCancelDownload,
      });
    }
  };

  return (
    <div className="m-0 flex w-full flex-row justify-between gap-4 bg-primary px-2 py-1 text-xs text-primary-foreground">
      <div className="flex flex-row items-center">
        <button
          className="flex flex-row items-center justify-center gap-1"
          type="button"
          onClick={displayServer}
        >
          {!error && (
            <span className={`${running ? 'accent-foreground' : 'muted-foreground'} `}>
              <Server className="h-4 w-4" strokeWidth={1.5} />
            </span>
          )}
          {error && (
            <span className="text-destructive-foreground">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
            </span>
          )}
          {(backendContext.server.status === 'init' ||
            backendContext.server.status === 'wait' ||
            backendContext.server.status === 'starting') && <span>{t('Server is starting')}</span>}
          {backendContext.server.status === 'started' && (
            <span>{model?.title || model?.name || t('Model unknown')}</span>
          )}
          {/* (backendContext.server.status === 'stopping' ||
            backendContext.server.status === 'stopped') && <span>{t('Server is stopped')}</span> */}
          {backendContext.server.status === 'error' && (
            <span className="text-destructive-foreground">{t('Server error')}</span>
          )}
        </button>

        {download && (
          <button
            className="ml-4 flex flex-row items-center justify-center gap-1"
            type="button"
            onClick={displayDownloads}
          >
            <span className="tabular-nums">
              <DownloadCloud className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span>
              <span>{download.fileName} </span>
              <span>{download.percentage} %</span>
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-row gap-2">
        {sys && (
          <div className="flex flex-row items-center justify-center gap-1">
            <span className="tabular-nums">
              <Cpu className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span>
              {sys?.cpus ? (
                <span>
                  {sys?.cpus.length} CPUs{' '}
                  {(
                    (sys?.cpus.reduce((acc, cpu) => acc + cpu.usage, 0) ?? 0) /
                    (sys?.cpus.length ?? 1)
                  ).toFixed()}
                  %
                </span>
              ) : (
                <span> </span>
              )}
            </span>
          </div>
        )}
        {usage && (
          <div className="flex flex-row items-center justify-center gap-1">
            <span className="tabular-nums">
              <BarChart3 className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span>
              {usage?.totalTokens ? (
                <span>
                  {usage.totalTokens} tokens {usage?.totalMs ? '| ' : ''}
                </span>
              ) : (
                <span> </span>
              )}
              {usage?.totalMs ? (
                <span>
                  {String(Math.round(usage.totalMs / 100) / 10)} sec{' '}
                  {usage?.totalPerSecond ? '| ' : ''}
                </span>
              ) : (
                <span> </span>
              )}
              {usage?.totalPerSecond ? (
                <span>{String(Math.round(usage.totalPerSecond * 10) / 10)} tokens/sec</span>
              ) : (
                <span> </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
