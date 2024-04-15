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
import SettingItem from '@/components/common/SettingItem';
import { Button } from '@/components/ui/button';
import { getConfigPath, getModelsPath } from '@/utils/backend/commands';
import { useEffect, useState } from 'react';

export default function Storage() {
  const { t } = useTranslation();
  const [configDir, setConfigDir] = useState<string>();
  const [dataDir, setDataDir] = useState<string>();
  useEffect(() => {
    const afunc = async () => {
      let dir = await getConfigPath();
      setConfigDir(dir);
      dir = await getModelsPath();
      setDataDir(dir);
    };
    afunc();
  }, []);

  return (
    <>
      <SettingItem
        title={t('Application path')}
        subtitle={t("In this path all Opla's files are stored")}
      >
        <p className="text-sm text-muted-foreground">{configDir}</p>
      </SettingItem>
      <SettingItem title={t('Models path')} subtitle={t('Where your models are saved')}>
        <p className="text-sm text-muted-foreground">{dataDir}</p>
      </SettingItem>
      <SettingItem title={t('Backup data')} subtitle={t('From ChatGPT or others')}>
        <Button variant="ghost">{t('Import')}</Button>
        <Button variant="ghost">{t('Export')}</Button>
      </SettingItem>
    </>
  );
}
