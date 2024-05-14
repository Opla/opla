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

import { useContext } from 'react';
import { Provider, ProviderType, Model } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import { AppContext } from '@/context';
import { createProvider } from '@/utils/data/providers';
import OpenAI from '@/utils/providers/openai';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import logger from '@/utils/logger';
import ModelInfos from '../../../common/ModelInfos';

type ModelTitleProps = {
  selectedModel?: Model;
};

export default function ModelTitle({ selectedModel }: ModelTitleProps) {
  const { providers } = useContext(AppContext);
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);

  let chatGPT = providers.find(
    (p: Provider) => p.type === ProviderType.openai && p.name === OpenAI.template.name,
  );

  const handleSetupChatGPT = () => {
    if (!chatGPT) {
      chatGPT = createProvider(OpenAI.template.name as string, OpenAI.template);
    }
    showModal(ModalIds.OpenAI, { item: chatGPT });
  };

  const handleNewLocalModel = () => {
    showModal(ModalIds.NewLocalModel);
  };

  const handleNewProviderModel = () => {
    showModal(ModalIds.NewProvider);
  };

  useShortcuts(ShortcutIds.INSTALL_MODEL, (event) => {
    event.preventDefault();
    logger.info('shortcut install Model');
    handleNewLocalModel();
  });
  useShortcuts(ShortcutIds.NEW_PROVIDER, (event) => {
    event.preventDefault();
    logger.info('shortcut new provider');
    handleNewProviderModel();
  });
  useShortcuts(ShortcutIds.CONFIG_GPT, (event) => {
    event.preventDefault();
    logger.info('shortcut configure ChatGPT');
    handleSetupChatGPT();
  });

  return selectedModel ? (
    <>
      <div className="grow capitalize text-foreground">
        {selectedModel && <ModelInfos model={selectedModel} displayIcon />}
      </div>
      <div className="flex-1" />
    </>
  ) : (
    <span>{t('Select a model')}</span>
  );
}
