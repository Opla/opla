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

import { useTranslation as useNextTranslation } from 'react-i18next';
import initI18n from '@/i18n/config';
import { useEffect } from 'react';
import useBackendContext from './useBackendContext';

const useTranslation = () => {
  const availableLanguages = initI18n();
  const { t, i18n } = useNextTranslation('translation');
  const { settings, setSettings } = useBackendContext();

  useEffect(() => {
    if (settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n]);

  const matchLanguage = (language: string, otherLanguage: string) =>
    language.toLowerCase().indexOf(otherLanguage) > -1;

  const getStoredLanguage = () => settings.language;

  const getLanguage = (): string =>
    settings.language ||
    (availableLanguages.find(
      (l) => matchLanguage(i18n.language, l) || availableLanguages[0],
    ) as string);

  const getAvailableLanguages = () => availableLanguages;

  const changeLanguage = (newLanguage: string | undefined) => {
    i18n.changeLanguage(newLanguage);
    setSettings({ ...settings, language: newLanguage });
  };

  return {
    t,
    i18n,
    matchLanguage,
    getStoredLanguage,
    getLanguage,
    getAvailableLanguages,
    changeLanguage,
  };
};

export default useTranslation;
