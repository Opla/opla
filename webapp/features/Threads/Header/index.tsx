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

import { AlertTriangle, ArrowRight, SplitSquareHorizontal, X } from 'lucide-react';
import useBackend from '@/hooks/useBackendContext';
import { AIServiceType, Provider, ProviderType, Ui, ViewSettings } from '@/types';
import { MenuAction } from '@/types/ui';
import { findProvider, updateProvider } from '@/utils/data/providers';
import { useAssistantStore, useModelsStore, useProviderStore, useThreadStore } from '@/stores';
import useTranslation from '@/hooks/useTranslation';
import { getActiveService } from '@/utils/services';
import { getAnyFirstModel } from '@/utils/data/models';
import { Button } from '@/components/ui/button';
import SelectModel from '@/components/common/SelectModel';
import HeaderMenu from './Menu';
import AssistantTitle from './AssistantTitle';

export type ThreadMenuProps = {
  selectedAssistantId: string | undefined;
  selectedModelId: string | undefined;
  selectedConversationId?: string;
  modelItems: Ui.MenuItem[];
  views: ViewSettings[];
  onSelectModel: (model: string, provider: ProviderType) => void;
  onSelectMenu: (menu: MenuAction, data: string) => void;
  onCloseView: () => void;
  onSplitView: () => void;
};

export default function ThreadHeader({
  selectedAssistantId,
  selectedModelId,
  selectedConversationId,
  modelItems,
  views,
  onSelectModel,
  onSelectMenu,
  onCloseView,
  onSplitView,
}: ThreadMenuProps) {
  const { getAssistant } = useAssistantStore();
  const { conversations } = useThreadStore();
  const { providers, setProviders } = useProviderStore();
  const { activeService } = useBackend();
  const modelStorage = useModelsStore();
  const conversation = conversations.find((c) => c.id === selectedConversationId);

  const assistant = getAssistant(selectedAssistantId);
  const service = getActiveService(
    conversation,
    assistant,
    providers,
    activeService,
    modelStorage,
    selectedModelId,
  );
  let selectedModel = service.model;
  if (!selectedModel && modelItems.length > 0) {
    selectedModel = getAnyFirstModel(providers, modelStorage);
  }
  const modelId = selectedModel?.id || selectedModelId;

  const selectedItem = modelItems.find((item) => item.key === modelId);

  const selectedTargetId =
    service?.type === AIServiceType.Assistant ? service.targetId : assistant?.targets?.[0]?.id;

  const { t } = useTranslation();

  const handleEnableProvider = () => {
    if (selectedItem?.group) {
      const provider = findProvider(selectedItem?.group, providers) as Provider;
      if (provider && provider.disabled) {
        const newProviders = updateProvider(
          { ...provider, disabled: !provider?.disabled },
          providers,
        );
        setProviders(newProviders);
      }
    }
  };

  let title;
  if (assistant) {
    title = (
      <AssistantTitle
        assistant={assistant}
        conversation={conversation}
        selectedTargetId={selectedTargetId}
        selectedItem={selectedItem}
        onEnableProvider={handleEnableProvider}
      />
    );
  } else if (selectedModel) {
    title = (
      <SelectModel
        modelItems={modelItems}
        selectedModel={selectedModel}
        selectedItem={selectedItem}
        onEnableProvider={handleEnableProvider}
        onSelectModel={onSelectModel}
      />
    );
  } else if (modelItems.length === 0 && !selectedConversationId) {
    return (
      <div className="flex w-full flex-col items-start justify-between px-4 py-0 sm:flex-row sm:items-center">
        <div className="flex grow items-center justify-between p-2 text-sm leading-none font-extrabold">
          {t('Welcome to Opla')}
        </div>
      </div>
    );
  } else {
    title = (
      <div className="text-error flex items-center justify-between rounded-md border p-2 text-sm leading-none font-medium">
        <AlertTriangle className="mr-4 h-4 w-4" strokeWidth={1.5} />
        <span>
          {t('No local model found.')}{' '}
          {modelItems.length === 0 ? t('Install one') : t('Select one')}
        </span>
        <ArrowRight className="ml-4 h-4 w-4" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start px-4 py-0 sm:flex-row sm:items-center">
      {title}
      {views?.length > 1 && (
        <Button
          variant="ghost"
          title={t('Close view')}
          aria-label={t('Close view')}
          size="icon"
          onClick={() => onCloseView()}
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </Button>
      )}
      <Button
        variant="ghost"
        title={t('Split view')}
        aria-label={t('Split view')}
        size="icon"
        onClick={() => onSplitView()}
      >
        <SplitSquareHorizontal className="h-4 w-4" strokeWidth={1.5} />
      </Button>
      <HeaderMenu selectedConversationId={selectedConversationId} onSelectMenu={onSelectMenu} />
    </div>
  );
}
