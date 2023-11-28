// Copyright 2023 mik
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
import SettingItem from '@/components/SettingItem';
import SettingsContainer from '@/components/SettingsContainer';
// import ToggleTheme from '@/components/ToggleTheme';

export default function Appearance() {
  const { t } = useTranslation();
  return (
    <SettingsContainer>
      <SettingItem title={t('Color scheme')} subtitle={t("Choose Opla's color scheme")}>
        Action
      </SettingItem>
      <SettingItem title={t('Accent color')} subtitle={t('Choose the accent color used in app')}>
        Action
      </SettingItem>
      <SettingItem title={t('Theme')} subtitle={t('Change the theme')}>
        Action
      </SettingItem>
    </SettingsContainer>
  );
}
