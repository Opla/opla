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
import { AlertTriangle, Bug, File, HelpCircle, Palette, Settings2, X } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { AppContext } from '@/context';
import useBackend from '@/hooks/useBackendContext';
import { getConversationAssets, updateConversation } from '@/utils/data/conversations';
import { findModel } from '@/utils/data/models';
import Opla from '@/utils/providers/opla';
import { getCompletionParametersDefinition } from '@/utils/providers';
import { findProvider, getLocalProvider } from '@/utils/data/providers';
import { ContextWindowPolicy, Conversation, Preset, PresetParameter } from '@/types';
import { toast } from '@/components/ui/Toast';
import { ContextWindowPolicies, DefaultContextWindowPolicy } from '@/utils/constants';
import { findCompatiblePreset, getCompletePresetProperties } from '@/utils/data/presets';
import { getFilename } from '@/utils/misc';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/accordion';
import { ScrollArea } from '../../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Textarea } from '../../ui/textarea';
import Parameter, { ParameterValue, ParametersRecord } from '../../common/Parameter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';
import Form from '../../common/Form';
import Presets from './Presets';
import { Button } from '../../ui/button';

export default function Settings({
  conversationId,
  errors,
}: {
  conversationId?: string;
  errors: string[];
}) {
  const { t } = useTranslation();
  const { conversations, updateConversations, providers, presets } = useContext(AppContext);
  const { backendContext } = useBackend();

  const selectedConversation = conversations.find((c) => c.id === conversationId);
  const { activeModel } = backendContext.config.models;
  const model = findModel(activeModel, backendContext.config.models.items);
  const provider = selectedConversation?.provider
    ? findProvider(selectedConversation?.provider, providers)
    : getLocalProvider(providers);
  const parametersDefinition = getCompletionParametersDefinition(provider);
  const modelName = selectedConversation?.model ?? model?.name;
  const preset = findCompatiblePreset(selectedConversation?.preset, presets, modelName, provider);
  const {
    parameters = {},
    system = selectedConversation?.system ?? model?.system ?? Opla.system,
    keepSystem,
    contextWindowPolicy: selectedPolicy = DefaultContextWindowPolicy,
  } = getCompletePresetProperties(preset, selectedConversation, presets);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    if (selectedConversation) {
      const newConversations = updateConversation(
        { ...selectedConversation, note: value },
        conversations,
        true,
      );
      updateConversations(newConversations);
    }
  };

  const handleSystemChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    if (selectedConversation) {
      const newConversations = updateConversation(
        { ...selectedConversation, system: value },
        conversations,
        true,
      );
      updateConversations(newConversations);
    }
  };

  const updateParameters = async (
    id: string | undefined,
    params: ParametersRecord,
  ): Promise<ParametersRecord | undefined> => {
    let newParams: ParametersRecord | undefined;
    if (id && selectedConversation) {
      let newConversation: Conversation | undefined;
      newParams = { ...params };
      let needUpdate = false;
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (value === undefined) {
          delete parameters[key];
          delete newParams?.[key];
          needUpdate = true;
        } else {
          const parameterDef = parametersDefinition[key];
          const result = parameterDef.z.safeParse(value);
          if (!result.success) {
            logger.error('updateParameters invalid', result.error);
            toast.error(result.error.message);
          } else {
            parameters[key] = result.data;
            delete newParams?.[key];
            needUpdate = true;
          }
        }
      });

      if (needUpdate) {
        if (selectedConversation.parameters && Object.keys(parameters).length === 0) {
          newConversation = { ...selectedConversation };
          delete newConversation.parameters;
        } else {
          newConversation = { ...selectedConversation, parameters };
        }
        const newConversations = updateConversation(newConversation, conversations, true);
        logger.info('onParameterChange save Parameters', params, parameters); // , params);
        updateConversations(newConversations);
      }
    }
    return newParams;
  };

  const handlePolicyChange = (policy: ContextWindowPolicy) => {
    if (selectedConversation) {
      const newConversations = updateConversation(
        { ...selectedConversation, contextWindowPolicy: policy },
        conversations,
        true,
      );
      updateConversations(newConversations);
    }
  };

  const deleteConversationAsset = (index: number) => {
    if (selectedConversation) {
      const newConversations = updateConversation(
        {
          ...selectedConversation,
          assets: getConversationAssets(selectedConversation).filter((_, i) => i !== index),
        },
        conversations,
        true,
      );
      updateConversations(newConversations);
    }
  };

  const handleKeepSystemChange = (name: string, value: ParameterValue) => {
    if (selectedConversation) {
      const newConversations = updateConversation(
        { ...selectedConversation, keepSystem: value as boolean },
        conversations,
        true,
      );

      updateConversations(newConversations);
    }
  };

  const handleChangePreset = (newPreset: string) => {
    if (selectedConversation) {
      const newConversations = updateConversation(
        { ...selectedConversation, preset: newPreset },
        conversations,
        true,
      );
      updateConversations(newConversations);
    }
  };

  return (
    <div className="scrollbar-trigger flex h-full w-full bg-neutral-100 dark:bg-neutral-900">
      <Tabs defaultValue="settings" className="w-full py-3">
        <div className="px-4">
          <TabsList className="justify-left w-full gap-4">
            <TabsTrigger value="settings">
              <Settings2 className="h-4 w-4" strokeWidth={1.5} />
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4" strokeWidth={1.5} />
            </TabsTrigger>
            <TabsTrigger value="documents">
              <File className="h-4 w-4" strokeWidth={1.5} />
            </TabsTrigger>
            <TabsTrigger value="debug">
              <Bug className="h-4 w-4" strokeWidth={1.5} />
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="settings" className="h-full py-4">
          <ScrollArea className="h-full w-full px-4">
            <Presets
              preset={preset}
              presetProperties={selectedConversation as Partial<Preset>}
              model={modelName}
              provider={provider}
              onChangePreset={handleChangePreset}
            />
            <Accordion type="multiple" className="w-full px-1" defaultValue={['settings-system']}>
              <AccordionItem value="settings-system">
                <AccordionTrigger>{t('System')}</AccordionTrigger>
                <AccordionContent className="m-0 p-2">
                  <Textarea
                    value={system}
                    onChange={handleSystemChange}
                    className="min-h-[240px] resize-none  overflow-y-hidden"
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="settings-parameters">
                <AccordionTrigger>{t('Parameters')}</AccordionTrigger>
                <AccordionContent>
                  <Form<PresetParameter>
                    id={selectedConversation?.id}
                    parameters={parameters}
                    parametersDefinition={parametersDefinition}
                    onParametersChange={updateParameters}
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="contextwindow-parameters">
                <AccordionTrigger>{t('Context window')}</AccordionTrigger>
                <AccordionContent className=" my-2 px-2 pb-8">
                  <div className="flex w-full flex-row py-2">
                    <Select defaultValue={selectedPolicy} onValueChange={handlePolicyChange}>
                      <SelectTrigger className="grow capitalize">
                        <SelectValue placeholder={t('Select policy')} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(ContextWindowPolicies).map((key) => (
                          <SelectItem key={key} value={key} className="capitalize">
                            {t(key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Tooltip>
                      <TooltipTrigger className="">
                        <HelpCircle className="ml-2 h-4 w-4" strokeWidth={1.5} />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="w-[265px] text-sm">{ContextWindowPolicies[selectedPolicy]}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <Parameter
                    label={t('Keep system')}
                    type="boolean"
                    name="keepSystem"
                    inputCss="max-w-20 pl-2"
                    value={keepSystem}
                    description={t('Keep system prompts for the final prompt')}
                    onChange={handleKeepSystemChange}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="appearance" className="px-4">
          {t('Thread / Document view')}
        </TabsContent>
        <TabsContent value="documents" className="px-4">
          {selectedConversation?.updatedAt && (
            <div className="w-full p-2 text-sm text-neutral-400">
              <div className="ellipsis flex w-full flex-row justify-between tabular-nums">
                <div className="line-clamp-1 text-xs">{t('ID')}:</div>
                <div className="ellipsis mb-4 line-clamp-1 break-all text-xs">
                  {selectedConversation.id}
                </div>
              </div>
              <div className="flex flex-row justify-between tabular-nums">
                <div>{t('Updated')} :</div>
                <div>{new Date(selectedConversation?.updatedAt).toLocaleString()}</div>
              </div>
              <div className="flex w-full flex-row justify-between tabular-nums">
                <div>{t('Created')} :</div>
                <div>{new Date(selectedConversation?.createdAt).toLocaleString()}</div>
              </div>
            </div>
          )}
          <div className="w-full p-2">
            <Textarea
              value={selectedConversation?.note ?? ''}
              disabled={!selectedConversation?.temp}
              placeholder={t('Write a note...')}
              className="min-h-[240px] resize-none  overflow-y-hidden"
              onChange={handleNoteChange}
            />
          </div>

          {selectedConversation && (
            <div className="w-full p-2 text-sm text-neutral-400">
              <div className="py-4">{t('Files')}</div>
              {getConversationAssets(selectedConversation).map((asset, index) => (
                <div className="flex w-full flex-row items-center p-1 text-xs" key={asset.id}>
                  <File className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  <span className="ellipsis mr-2 line-clamp-1 grow break-all">
                    {asset.type === 'file' ? getFilename(asset.file) : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-1"
                    onClick={() => {
                      deleteConversationAsset(index);
                    }}
                  >
                    <X className="h-4 w-4 text-red-400" strokeWidth={1.5} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="debug" className="px-4">
          {t('Debug')}
        </TabsContent>
        <TabsContent value="debug" className="px-4">
          {errors.map((error) => (
            <div key={error.substring(0, 5)} className="p-2 text-xs text-red-500">
              <p>
                <AlertTriangle className="mr-2 inline-flex h-4 w-4 text-red-500" />
                <span>{error}</span>
              </p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
