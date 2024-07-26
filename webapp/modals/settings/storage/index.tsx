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

'use client';

import useTranslation from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import {
  chooseDirectory,
  getConfigPath,
  getModelsPath,
  setModelsPath,
} from '@/utils/backend/commands';
import { useEffect, useState } from 'react';
import Parameter from '@/components/common/Parameter';
import { ResetIcon } from '@radix-ui/react-icons';
import logger from '@/utils/logger';
// import useBackendContext from '@/hooks/useBackendContext';

export default function Storage() {
  const { t } = useTranslation();
  // const { updateBackendStore } = useBackendContext();
  const [configDir, setConfigDir] = useState<string>();
  const [dataDir, setDataDir] = useState<string>();

  const updateDirs = async () => {
    let dir = await getConfigPath();
    setConfigDir(dir);
    dir = await getModelsPath();
    setDataDir(dir);
  };

  useEffect(() => {
    updateDirs();
  }, []);

  const handleChangeModelsPath = async (newPath?: string | undefined) => {
    logger.info('New model path', newPath);
    await setModelsPath(newPath);
    // await updateBackendStore();
    await updateDirs();
  };

  const handleChooseModelsPath = async () => {
    const newPath = await chooseDirectory();
    if (newPath) {
      handleChangeModelsPath(newPath);
    }
  };

  return (
    <>
      <Parameter
        label={t('Application path')}
        sublabel={t("In this path all Opla's files are stored")}
        name="path"
        value={configDir}
        type="path"
        disabled
        onChange={() => {}}
        className="border-b"
      >
        <Button variant="ghost" size="sm" className="text-muted-foreground" disabled>
          <ResetIcon strokeWidth={1.5} className="h-4 w-4" />
        </Button>
      </Parameter>
      <Parameter
        label={t('Models path')}
        sublabel={t('Where your models are saved')}
        name="modelPath"
        value={dataDir}
        type="path"
        onAction={() => handleChooseModelsPath()}
        className="border-b"
      >
        <Button
          variant="ghost"
          size="sm"
          className=""
          onClick={(e) => {
            e.preventDefault();
            handleChangeModelsPath();
          }}
        >
          <ResetIcon strokeWidth={1.5} className="h-4 w-4" />
        </Button>
      </Parameter>
      <Parameter
        name="backup"
        label={t('Backup data')}
        sublabel={t('From ChatGPT or others')}
        className="border-b"
      >
        <Button variant="ghost">{t('Import')}</Button>
        <Button variant="ghost">{t('Export')}</Button>
      </Parameter>
    </>
  );
}
