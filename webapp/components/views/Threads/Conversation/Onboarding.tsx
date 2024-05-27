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

import { Bot } from 'lucide-react';
import { PromptTemplate, Ui } from '@/types';
import { MenuAction } from '@/types/ui';
import useTranslation from '@/hooks/useTranslation';
import EmptyView from '@/components/common/EmptyView';
import Opla from '@/components/icons/Opla';
import { useAssistantStore } from '@/stores';
import AvatarView from '@/components/common/AvatarView';
import PromptsGrid from './PromptsGrid';

export type OnboardingProps = {
  selectedAssistantId: string | undefined;
  selectedModelName: string | undefined;
  hasModels: boolean;
  disabled: boolean;
  onSelectMenu: (menu: MenuAction, data: string) => void;
  onPromptSelected: (prompt: PromptTemplate) => void;
};

function Onboarding({
  selectedAssistantId,
  selectedModelName,
  hasModels,
  disabled,
  onSelectMenu,
  onPromptSelected,
}: OnboardingProps) {
  const { t } = useTranslation();
  const { getAssistant } = useAssistantStore();

  const assistant = getAssistant(selectedAssistantId);

  let actions: Ui.MenuItem[] | undefined;
  let buttonLabel: string | undefined;
  let description = t(
    "Welcome to Opla! Our platform leverages the power of your device to deliver personalized AI assistance. To kick things off, you'll need to install a model or an assistant. Think of it like choosing your conversation partner. If you've used ChatGPT before, you'll feel right at home here. Remember, this step is essential to begin your journey with Opla. Let's get started!",
  );
  if (assistant) {
    description = assistant?.description || t('Opla works using your machine processing power.');
  } else if (selectedModelName) {
    buttonLabel = t('Start a conversation');
    description = t('Opla works using your machine processing power.');
  } else if (hasModels) {
    description = t('Opla works using your machine processing power.');
  } else {
    actions = [
      {
        label: t('Choose an assistant'),
        onSelect: (data: string) => onSelectMenu(MenuAction.ChooseAssistant, data),
        value: 'choose_assistant',
        description:
          'Opt for a specialized AI agent or GPT to navigate and enhance your daily activities. These assistants can utilize both local models and external services like OpenAI, offering versatile support.',
      },
      {
        label: t('Install a local model'),
        onSelect: (data: string) => onSelectMenu(MenuAction.InstallModel, data),
        value: 'install_model',
        variant: 'outline',
        description:
          'Incorporate an open-source Large Language Model (LLM) such as Gemma or LLama2 directly onto your device. Dive into the world of advanced generative AI and unlock new experimental possibilities.',
      },
      {
        label: t('Use OpenAI'),
        onSelect: (data: string) => onSelectMenu(MenuAction.ConfigureOpenAI, data),
        value: 'configure_openai',
        variant: 'ghost',
        description:
          'Integrate using your OpenAI API key to import ChatGPT conversations and tap into the extensive capabilities of OpenAI. Experience the contrast with local AI solutions. Remember, ChatGPT operates remotely and at a cost!',
      },
    ];
  }

  return (
    <div className="flex grow flex-col">
      <EmptyView
        className="m-2 flex grow"
        title={
          assistant?.title ||
          assistant?.name ||
          t('Empower Your Productivity with Local AI Assistants')
        }
        description={description}
        buttonLabel={disabled ? buttonLabel : undefined}
        icon={
          assistant ? (
            <AvatarView
              avatar={assistant.avatar}
              className="h-10 w-10"
              icon={assistant.avatar ? undefined : <Bot className="h-10 w-10" strokeWidth={1.5} />}
            />
          ) : (
            <Opla className="h-10 w-10 animate-pulse" />
          )
        }
        actions={actions}
      />
      {(selectedAssistantId || selectedModelName) && (
        <PromptsGrid
          assistantPrompts={assistant ? assistant?.promptTemplates || [] : undefined}
          onPromptSelected={onPromptSelected}
          disabled={disabled}
          className="pb-4"
        />
      )}
    </div>
  );
}

export default Onboarding;
