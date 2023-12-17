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

import useTheme from '@/hooks/useTheme';
import useTranslation from '@/hooks/useTranslation';
import SettingItem from '@/components/common/SettingItem';
import Dropdown from '@/components/common/Dropdown';
import logger from '@/utils/logger';
import { PiLaptop, PiMoon, PiSun } from 'react-icons/pi';

export default function Appearance() {
  const { t } = useTranslation();
  const { theme, setTheme, isSystem } = useTheme();

  const colorSchemes = [
    { label: 'System', value: 'system', icon: PiLaptop, selected: isSystem },
    { label: 'Light', value: 'light', icon: PiSun, selected: !isSystem && theme === 'light' },
    { label: 'Dark', value: 'dark', icon: PiMoon, selected: !isSystem && theme === 'dark' },
  ];

  const onSelectColorScheme = (value?: string, data?: string) => {
    logger.info(`onSelectColorScheme ${value} ${data}`);
    setTheme(value as string);
  };

  return (
    <>
      <SettingItem title={t('Color scheme')} subtitle={t("Choose Opla's color scheme")}>
        <Dropdown items={colorSchemes} onSelect={onSelectColorScheme} />
      </SettingItem>
      <SettingItem title={t('Accent color')} subtitle={t('Choose the accent color used in app')}>
        Action
      </SettingItem>
      <SettingItem title={t('Theme')} subtitle={t('Change the theme')}>
        Action
      </SettingItem>
    </>
  );
}
