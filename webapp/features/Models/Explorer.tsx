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

import { useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { BrainCircuit, HardDriveDownload, Plus } from 'lucide-react';
import { Ui, Model, ModelState, AIService, AIServiceType } from '@/types';
import useBackend from '@/hooks/useBackendContext';
import useTranslation from '@/hooks/useTranslation';
import { ModalsContext } from '@/context/modals';
import { ModalIds } from '@/types/ui';
import logger from '@/utils/logger';
import { shortcutAsText } from '@/utils/shortcuts';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import Explorer, { ExplorerGroup, ExplorerList } from '@/components/common/Explorer';
import { getModelsCollection, uninstallModel, updateModel } from '@/utils/backend/commands';
import EmptyView from '@/components/common/EmptyView';
import { cn } from '@/lib/utils';
import { getLocalModels, getProviderModels } from '@/utils/data/models';
import { AppContext } from '@/context';
import { useAssistantStore } from '@/stores';
import { addConversationService, isModelUsedInConversations } from '@/utils/data/conversations';
import { getLocalProvider } from '@/utils/data/providers';
import ModelIcon from '@/components/common/ModelIcon';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '../../components/ui/button';
import EditableItem from '../../components/common/EditableItem';
import ModelInfos from '../../components/common/ModelInfos';

export type ModelsExplorerProps = {
  selectedId?: string;
};

function ModelsExplorer({ selectedId: selectedModelId }: ModelsExplorerProps) {
  const { conversations, updateConversations, providers } = useContext(AppContext);
  const [closeLocal, toggleCloseLocal] = useState(false);
  const [closeCloud, toggleCloseCloud] = useState(false);
  const [closeFeatured, toggleCloseFeatured] = useState(false);
  const { isModelUsedInAssistants } = useAssistantStore();
  const { config, activeService, updateBackendStore } = useBackend();
  const router = useRouter();
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);
  const [collection, setCollection] = useState<Model[]>([]);

  useEffect(() => {
    const getCollection = async () => {
      const coll = (await getModelsCollection()) as unknown as { models: Model[] };
      const collectionModels = coll.models
        .filter((m) => m.featured === true)
        .map((m) => ({ ...m, id: m.name }));
      setCollection(collectionModels);
    };
    getCollection();
  }, []);

  const models = useMemo(() => getLocalModels(config.models), [config.models]);
  const cloudModels = useMemo(() => getProviderModels(providers), [providers]);

  const handleSelectModel = (id: string) => {
    logger.info(`onSelectModel ${id}`);
    const route = Ui.Page.Models;
    router.push(`${route}/${id}`);
  };

  const handleNewLocalModel = () => {
    showModal(ModalIds.NewLocalModel);
  };

  const handleSelectCloudModel = () => {
    showModal(ModalIds.CloudModels);
  };

  const handleModelRename = async (name: string, id: string) => {
    const updatedModel = models.find((m) => m.id === id);
    logger.info(`change model name ${id} ${name}`, updatedModel, models);
    if (updatedModel && updatedModel.name !== name) {
      await updateModel({ ...updatedModel, name });
      await updateBackendStore();
    }
  };

  const handleChangeModelName = (id: string, name: string) => {
    logger.info(`change model name ${id} ${name}`);
    handleModelRename(id, name);
  };

  const handleUninstall = async (modelId: string) => {
    logger.info(`Uninstall ${modelId}`);
    const model = models.find((m) => m.id === modelId);
    if (model) {
      const isUsed: boolean =
        (activeService?.type === AIServiceType.Model && activeService.modelId === model.id) ||
        isModelUsedInConversations(conversations, model) ||
        isModelUsedInAssistants(model);
      if (isUsed) {
        const service: AIService = {
          type: AIServiceType.Model,
          modelId,
          providerIdOrName: getLocalProvider(providers)?.id,
        };
        const updatedConversations = conversations.map((conversation) => {
          let updatedConversation = conversation;
          if (!conversation.services) {
            updatedConversation = addConversationService(conversation, service);
          }
          return updatedConversation;
        });
        await updateConversations(updatedConversations);
      }
      const nextModelId =
        models.findLast((m) => m.state !== ModelState.Removed && m.id !== modelId)?.id || '';
      await uninstallModel(modelId, isUsed);
      await updateBackendStore();
      router.replace(`/models${nextModelId ? `/${nextModelId}` : ''}`);
    }
  };

  useShortcuts(ShortcutIds.INSTALL_MODEL, (event) => {
    event.preventDefault();
    logger.info('shortcut install Model');
    handleNewLocalModel();
  });

  const menu: Ui.MenuItem[] = [
    {
      label: t('Uninstall'),
      onSelect: (data: string) => {
        handleUninstall(data);
      },
    },
  ];

  return (
    <Explorer
      title={t('Models')}
      toolbar={
        <div className="mr-2 flex content-center gap-2">
          <Button
            aria-label={t('Install local model')}
            title={`${t('Install local model')} ${shortcutAsText(ShortcutIds.INSTALL_MODEL)}`}
            variant="ghost"
            size="icon"
            onClick={handleNewLocalModel}
          >
            <HardDriveDownload className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button
            aria-label={t('Add cloud model')}
            title={`${t('Add cloud model')} ${shortcutAsText(ShortcutIds.INSTALL_MODEL)}`}
            variant="ghost"
            size="icon"
            onClick={handleSelectCloudModel}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      }
    >
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel id="models" className="!overflow-y-auto pt-2" minSize={4}>
          <ExplorerGroup
            title={t('Local models')}
            className="h-full"
            closed={closeLocal}
            onToggle={() => {
              toggleCloseLocal(!closeLocal);
            }}
          >
            {models.length > 0 && (
              <ExplorerList<Model>
                selectedId={selectedModelId}
                items={models}
                renderLeftSide={(m) => (
                  <ModelIcon
                    icon={m.icon}
                    name={m.name}
                    className="h-4 w-4"
                    providerName={m.creator}
                  />
                )}
                renderItem={(model) => (
                  <>
                    {!model.editable && (
                      <div className="flex w-full grow flex-row items-center justify-between overflow-hidden pl-0">
                        <div
                          className={cn(
                            'flex-1 text-ellipsis break-all pr-1',
                            model.state === ModelState.Error || model.state === ModelState.NotFound
                              ? 'text-error'
                              : '',
                          )}
                        >
                          {model.title || model.name}
                        </div>
                        <ModelInfos model={model} displayName={false} stateAsIcon />
                      </div>
                    )}
                    {model.editable && (
                      <div className="flex w-full grow">
                        <EditableItem
                          id={model.id}
                          title={model.title || model.name}
                          editable
                          className={cn(
                            'line-clamp-1 h-auto w-full flex-1 overflow-hidden text-ellipsis break-all px-0 py-1',
                            model.state === ModelState.Error || model.state === ModelState.NotFound
                              ? 'text-error'
                              : '',
                          )}
                          onChange={handleChangeModelName}
                        />
                      </div>
                    )}
                  </>
                )}
                onSelectItem={handleSelectModel}
                menu={() => menu}
              />
            )}
            {models.length === 0 && (
              <div className="h-full pb-8">
                <EmptyView
                  title={t('No models')}
                  description={t("Let's add one!")}
                  icon={
                    <BrainCircuit className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                  }
                  className="h-full"
                />
              </div>
            )}
          </ExplorerGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="cloud" className="!overflow-y-auto pt-2" minSize={3}>
          <ExplorerGroup
            title={t('Cloud models')}
            className="h-full pb-8"
            closed={closeCloud}
            onToggle={() => {
              toggleCloseCloud(!closeCloud);
            }}
          >
            <ExplorerList<Model>
              selectedId={selectedModelId}
              renderLeftSide={(m) => (
                <ModelIcon
                  icon={m.icon}
                  name={m.name}
                  className="h-4 w-4 text-muted-foreground"
                  providerName={m.creator}
                />
              )}
              items={cloudModels}
              onSelectItem={handleSelectModel}
            />
          </ExplorerGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="featured" className="!overflow-y-auto pt-2" minSize={3}>
          <ExplorerGroup
            title={t('Featured models')}
            className="h-full pb-8"
            closed={closeFeatured}
            onToggle={() => {
              toggleCloseFeatured(!closeFeatured);
            }}
          >
            <ExplorerList<Model>
              selectedId={selectedModelId}
              renderLeftSide={(m) => (
                <ModelIcon
                  icon={m.icon}
                  name={m.name}
                  className="h-4 w-4 text-muted-foreground"
                  providerName={m.creator}
                />
              )}
              items={collection}
              onSelectItem={handleSelectModel}
            />
          </ExplorerGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Explorer>
  );
}

export default ModelsExplorer;
