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

import { useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { DownloadIcon } from '@radix-ui/react-icons';
import useTranslation from '@/hooks/useTranslation';
import { AIService, AIServiceType, Model, ModelState, Provider, ProviderType } from '@/types';
import { deepCopy, deepMerge, getEntityName, getResourceUrl } from '@/utils/data';
import useParameters from '@/hooks/useParameters';
import ContentView from '@/components/common/ContentView';
import { ScrollArea } from '@/components/ui/scroll-area';
import logger from '@/utils/logger';
import {
  cancelDownloadModel,
  getModelFullPath,
  getModelsCollection,
  installModel,
  uninstallModel,
  updateModel,
  updateModelEntity,
} from '@/utils/backend/commands';
import useBackend from '@/hooks/useBackendContext';
import {
  findSameModel,
  getDownloadables,
  getProviderModels,
  isValidFormat,
} from '@/utils/data/models';
import { ModalIds, Page } from '@/types/ui';
import { ModalsContext } from '@/context/modals';
import EmptyView from '@/components/common/EmptyView';
import { BrainCircuit } from 'lucide-react';
import { fileExists } from '@/utils/backend/tauri';
import { toast } from 'sonner';
import { addConversationService, isModelUsedInConversations } from '@/utils/data/conversations';
import { AppContext } from '@/context';
import { useAssistantStore } from '@/stores';
import { OrangePill } from '@/components/ui/Pills';
import { getLocalProvider } from '@/utils/data/providers';
import OpenAI from '@/utils/providers/openai';
import ModelIcon from '@/components/common/ModelIcon';
import Parameter, { ParametersRecord } from '../../components/common/Parameter';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
  TableHead,
} from '../../components/ui/table';
import ModelInfos from '../../components/common/ModelInfos';

export type ModelViewProps = {
  selectedId?: string;
};

function ModelView({ selectedId: selectedModelId }: ModelViewProps) {
  const { t } = useTranslation();

  const [fullPathModel, setFullPathModel] = useState<string | undefined>();
  const { config, downloads, updateBackendStore } = useBackend();
  const { conversations, updateConversations, providers, setProviders } = useContext(AppContext);
  const { isModelUsedInAssistants } = useAssistantStore();
  const [collection, setCollection] = useState<Model[]>([]);
  const { showModal } = useContext(ModalsContext);
  const router = useRouter();

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

  const [downloadsModel, models, model, downloadables, local, inUse] = useMemo(() => {
    let l = true;
    const mdls = config.models.items;
    let mdl = mdls.find((m) => m.id === selectedModelId) as Model;
    if (!mdl && selectedModelId) {
      mdl = collection.find((m) => m.id === selectedModelId) as Model;
      l = false;
    }
    if (!mdl && selectedModelId) {
      mdl = getProviderModels(providers).find((m) => m.id === selectedModelId) as Model;
      l = false;
    }
    const dls: Model[] = l
      ? []
      : getDownloadables(mdl).filter((d) => d.private !== true && isValidFormat(d));

    const { activeService } = config.services;
    const isUsed: boolean =
      mdl &&
      ((activeService?.type === AIServiceType.Model && activeService.modelId === mdl.id) ||
        isModelUsedInConversations(conversations, mdl) ||
        isModelUsedInAssistants(mdl));

    return [downloads || [], mdls, mdl, dls, l, isUsed];
  }, [
    config.models.items,
    config.services,
    selectedModelId,
    conversations,
    isModelUsedInAssistants,
    downloads,
    collection,
    providers,
  ]);

  let isDownloading = false;
  if (local) {
    isDownloading =
      model?.state === ModelState.Downloading ||
      downloadsModel.findIndex((d) => d.id === model?.id) !== -1;
  }

  const handleParametersChange = async (id: string | undefined, parameters: ParametersRecord) => {
    logger.info(`change model parameters ${id} ${parameters}`);
    // onParametersChange(id, parameters);
    let updatedModel = models.find((m) => m.id === id) as Model;
    if (updatedModel) {
      let needUpdate = false;
      updatedModel = deepCopy<Model>(updatedModel);
      Object.keys(parameters).forEach((key) => {
        switch (key) {
          case 'name':
            if (parameters[key] !== updatedModel.name) {
              updatedModel.name = parameters[key] as string;
              needUpdate = true;
            }
            break;
          case 'description':
            if (parameters[key] !== updatedModel.description) {
              updatedModel.description = parameters[key] as string;
              needUpdate = true;
            }
            break;
          case 'author':
            if (parameters[key] !== updatedModel.author) {
              updatedModel.author = parameters[key] as string;
              needUpdate = true;
            }
            break;
          default:
            logger.warn(`unknown parameter ${key}`);
        }
      });
      if (needUpdate) {
        await updateModel(updatedModel);
        await updateBackendStore();
      }
    }
    return undefined;
  };

  const [updatedParameters, setUpdatedParameters] = useParameters(
    selectedModelId,
    handleParametersChange,
  );

  useEffect(() => {
    const getFullPath = async () => {
      if (model?.fileName) {
        let exist = false;
        let full = '';
        const modelPath = getResourceUrl(model.path);
        try {
          full = await getModelFullPath(modelPath, model.fileName);
          exist = await fileExists(full);
        } catch (error) {
          logger.error(error);
        }

        if (!exist && model.state !== ModelState.NotFound) {
          logger.error(`File not found ${modelPath} ${model.fileName} ${full}`);
          toast.error(`File not found ${full}`);
          await updateModelEntity({ ...model, state: ModelState.NotFound });
          await updateBackendStore();
        } else if (exist && model.state === ModelState.NotFound) {
          logger.info(
            `File found path=${modelPath} model.path=${model.path} model.fileName=${model.fileName} full=${full}`,
          );
          await updateModelEntity({ ...model, state: ModelState.Ok });
          await updateBackendStore();
        }
        setFullPathModel(full);
      }
    };
    getFullPath();
  }, [fullPathModel, model, updateBackendStore]);

  const handleInstall = async (item?: Model) => {
    const selectedModel: Model = deepMerge<Model>(model, item || {}, true);
    logger.info(`install ${model.name}`, selectedModel, item);
    if (selectedModel.private === true) {
      delete selectedModel.private;
    }
    if (selectedModel.include) {
      delete selectedModel.include;
    }
    const path = getEntityName(selectedModel.creator || selectedModel.author);
    const sameModel = findSameModel(selectedModel, config);

    if (sameModel && sameModel.state !== ModelState.Removed) {
      toast.error(`${t('Model already installed ')} ${selectedModel.name}`);
      return;
    }
    let id;
    let restored = false;
    if (sameModel?.state === ModelState.Removed) {
      sameModel.state = ModelState.Ok;
      await updateModelEntity(sameModel);
      logger.info(`restored ${sameModel.id}`);
      ({ id } = sameModel);
      restored = true;
    } else {
      id = await installModel(
        selectedModel,
        getResourceUrl(selectedModel.download),
        path,
        selectedModel.name,
      );
    }
    await updateBackendStore();
    logger.info(`installed ${id}`);
    router.push(`${Page.Models}/${id}`);
    if (restored) {
      toast.success(`${t('Model restored')} ${selectedModel.name}`);
    }
  };

  const handleUninstall = async () => {
    logger.info(`Uninstall ${model.name} model.id=${model.id} inUse=${inUse}`);

    const nextModelId =
      models.findLast((m) => m.state !== ModelState.Removed && m.id !== model.id)?.id || '';
    await uninstallModel(model.id, inUse);
    if (inUse) {
      const service: AIService = {
        type: AIServiceType.Model,
        modelId: model.id,
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
    await updateBackendStore();
    router.replace(`/models${nextModelId ? `/${nextModelId}` : ''}`);
  };

  const handleCancelDownload = async (action: string, data: any) => {
    const modelId = data.item.id;
    logger.info(`Cancel download ${action} model.id=${modelId}`);
    const nextModelId = models.findLast((m) => m.id !== modelId)?.id || '';
    await cancelDownloadModel(modelId);
    await updateBackendStore();
    router.replace(`/models${nextModelId ? `/${nextModelId}` : ''}`);
  };

  const handleLocalInstall = (selectedModel?: Model) => {
    if (isDownloading) {
      showModal(ModalIds.Downloads, { item: model, onAction: handleCancelDownload });
      return;
    }

    if (local && !selectedModel) {
      handleUninstall();
      return;
    }
    let item: Model = selectedModel || model;
    // If the model is not a GGUF model, we need to find the recommended or first download
    if (!isValidFormat(item) && downloadables.length > 0) {
      item = downloadables.find((d) => d.recommended) || downloadables[0];
    }

    if (isValidFormat(item)) {
      handleInstall(item);
    } else {
      logger.info(`No valid format ${item?.name} ${item?.library}`);
    }
  };

  const handleRemoveCloudModel = (selectedModel?: Model) => {
    const chatGPT = providers.find(
      (p: Provider) => p.type === ProviderType.openai && p.name === OpenAI.template.name,
    );
    const updatedModels = chatGPT?.models?.filter((m) => m.id !== selectedModel?.id);
    const updatedProviders = providers.map((p) =>
      p.id === chatGPT?.id ? { ...chatGPT, models: updatedModels } : p,
    );
    setProviders(updatedProviders);
  };

  if (!model) {
    return (
      <ContentView className="pb-8">
        <EmptyView
          icon={<BrainCircuit className="h-16 w-16 text-muted" />}
          title={models.length > 0 ? t('Local models') : t("You don't have any models")}
          description={t(
            'You could add some local models by installing a featured model, or directly a gguf file from you machine.',
          )}
          className="h-full"
        />
      </ContentView>
    );
  }

  return (
    <ContentView
      header={
        <div className="mx-3 flex h-7 grow flex-row items-center px-2">
          <span className="gap-1 py-1 capitalize text-neutral-700 dark:text-neutral-500">
            {`${model.creator || getEntityName(model.author) || t('Local')}`}
          </span>
          <span className="pl-2">/</span>
          <div className="flex grow items-center gap-2 truncate px-2">
            <span>{model.name}</span>
            {local &&
              (inUse ? <OrangePill label={t('In use')} /> : <OrangePill label={t('Not in use')} />)}
            <ModelInfos model={model} displayName={false} />
          </div>
        </div>
      }
      selectedId={model.id}
      toolbar={
        model.state !== ModelState.Removed && (
          <div className="flex flex-row gap-2">
            {model.state !== ModelState.Pending && !model.provider && (
              <Button variant="secondary" className="" onClick={() => handleLocalInstall(model)}>
                {isDownloading && t('Downloading...')}
                {!isDownloading && (local ? t('Uninstall') : t('Install'))}
              </Button>
            )}
            {model.provider === 'OpenAI' && (
              <Button
                variant="secondary"
                className=""
                onClick={() => handleRemoveCloudModel(model)}
              >
                {t('Remove')}
              </Button>
            )}
            {/* local && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <PiDotsThreeVerticalBold className="h-4 w-4"  strokeWidth={1.5} />
          <span className="sr-only">{t('More')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <>
          <DropdownMenuItem onSelect={() => onChange()}>
            {t('Uninstall & Remove')}
          </DropdownMenuItem>
          <DropdownMenuItem>{t('Open in Finder')}</DropdownMenuItem>
          <DropdownMenuItem>{t('Change version')}</DropdownMenuItem>
        </>
      </DropdownMenuContent>
    </DropdownMenu>
  ) */}
          </div>
        )
      }
    >
      <ScrollArea className="h-full px-8 py-8">
        <div className="flex w-full flex-col p-4 text-sm">
          <form className="grid w-full items-start gap-6 overflow-auto">
            <fieldset className="grid gap-6 rounded-lg border p-4">
              <div className="flex w-full flex-row items-center gap-2">
                <ModelIcon
                  icon={model.icon}
                  name={model.name}
                  className="h-4 w-4"
                  providerName={model.creator}
                />
                <h1 className="items-right bold w-full text-xl font-extrabold">
                  {model.title || model.name}
                </h1>
              </div>
              <div className="flex w-full flex-col items-center gap-2 text-sm">
                {model?.editable && (
                  <Parameter
                    label=""
                    name="description"
                    value={updatedParameters?.description || t(model.description || '')}
                    disabled={!model.editable}
                    type="large-text"
                    placeholder="Description"
                    onChange={setUpdatedParameters}
                  />
                )}
                {!model?.editable && (
                  <p>{(updatedParameters?.description as string) || t(model.description || '')}</p>
                )}
                {model?.editable && (
                  <Parameter
                    label=""
                    name="system"
                    value={updatedParameters?.system || t(model.system || '')}
                    disabled={!model.editable}
                    type="large-text"
                    placeholder="System"
                    onChange={setUpdatedParameters}
                  />
                )}
                {!model?.editable && (
                  <p>{(updatedParameters?.system as string) || t(model.system || '')}</p>
                )}
                {model?.editable && (
                  <Parameter
                    label=""
                    name="Chat template"
                    value={updatedParameters?.chatTemplate || t(model.chatTemplate || '')}
                    disabled={!model.editable}
                    type="large-text"
                    placeholder="Chat template"
                    onChange={setUpdatedParameters}
                  />
                )}
                {!model?.editable && (
                  <p>
                    {(updatedParameters?.chatTemplate as string) || t(model.chatTemplate || '')}
                  </p>
                )}
                {model.fileName && (
                  <Parameter
                    label={t('File')}
                    name="file"
                    value={fullPathModel}
                    disabled
                    type="file"
                    inputCss={model.state === ModelState.NotFound ? 'text-error' : ''}
                  />
                )}
                {model.author && (
                  <Parameter
                    label={t('Author')}
                    name="author"
                    value={updatedParameters?.author || `${getEntityName(model.author)}`}
                    disabled={!model.editable}
                    type="text"
                    onChange={setUpdatedParameters}
                  />
                )}
                {getEntityName(model.creator).toLowerCase() !==
                  getEntityName(model.author).toLowerCase() && (
                  <Parameter
                    label={t('Creator')}
                    name="version"
                    value={`${getEntityName(model.creator)}`}
                    disabled={!model.editable}
                    type="text"
                  />
                )}
                {model.publisher &&
                  getEntityName(model.publisher).toLowerCase() !==
                    getEntityName(model.author).toLowerCase() &&
                  getEntityName(model.publisher).toLowerCase() !==
                    getEntityName(model.creator).toLowerCase() && (
                    <Parameter
                      label={t('Publisher')}
                      name="version"
                      value={`${getEntityName(model.publisher)}`}
                      disabled={!model.editable}
                      type="text"
                    />
                  )}
                {model.version && (
                  <Parameter
                    label={t('Version')}
                    name="version"
                    value={`${model.version}`}
                    disabled={!model.editable}
                    type="text"
                  />
                )}
                {model.license && (
                  <Parameter
                    label={t('License')}
                    name="license"
                    value={`${getEntityName(model.license)}`}
                    disabled={!model.editable}
                    type="text"
                  />
                )}
                {model.repository && (
                  <Parameter
                    label={t('Repository')}
                    name="url"
                    value={`${getResourceUrl(model.repository)}`}
                    disabled={!model.editable}
                    type="url"
                  />
                )}
              </div>
            </fieldset>
          </form>
          {downloadables.length > 0 && (
            <form className="grid w-full items-start gap-6 overflow-auto pt-8">
              <fieldset className="grid gap-6 rounded-lg border p-4">
                <legend className="-ml-1 px-1 text-sm font-medium">
                  {t('Downloadable implementations')}
                </legend>
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('File')}</TableHead>
                      <TableHead>{t('Description')}</TableHead>
                      <TableHead>{t('Parameters')}</TableHead>
                      <TableHead>{t('Action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {downloadables.map((download) => (
                      <TableRow onClick={() => {}} key={download.id || download.name}>
                        <TableCell className="truncate">{download.name}</TableCell>
                        <TableCell className="truncate">
                          <span>{download.recommendations || ''}</span>
                        </TableCell>
                        <TableCell className="truncate">
                          <ModelInfos model={download} displayName={false} />
                        </TableCell>
                        <TableCell aria-label={t('Download')}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleLocalInstall(download)}
                          >
                            <DownloadIcon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </fieldset>
            </form>
          )}
        </div>
      </ScrollArea>
    </ContentView>
  );
}

export default ModelView;
