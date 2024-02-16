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
import { AlertTriangle, Bug, File, HelpCircle, Palette, Settings2 } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { AppContext } from '@/context';
import useBackend from '@/hooks/useBackendContext';
import { isKeepSystem, updateConversation } from '@/utils/data/conversations';
import { findModel } from '@/utils/data/models';
import Opla from '@/utils/providers/opla';
import { getCompletionParametersDefinition } from '@/utils/providers';
import { findProvider } from '@/utils/data/providers';
import { ContextWindowPolicy, Conversation, ConversationParameter } from '@/types';
import { toast } from '@/components/ui/Toast';
import { ContextWindowPolicies, DefaultContextWindowPolicy } from '@/utils/constants';
// import useDebounceFunc from '@/hooks/useDebounceFunc';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import Parameter, { ParameterValue, ParametersRecord } from '../common/Parameter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import Form from '../common/Form';

export default function Settings({
  conversationId,
  errors,
}: {
  conversationId?: string;
  errors: string[];
}) {
  const { t } = useTranslation();
  const { conversations, updateConversations, providers } = useContext(AppContext);
  const { backendContext } = useBackend();
  // const [params, setParams] = useState<ParametersRecord>({});

  const selectedConversation = conversations.find((c) => c.id === conversationId);
  const { activeModel } = backendContext.config.models;
  const model = findModel(activeModel, backendContext.config.models.items);
  const provider = findProvider(selectedConversation?.provider, providers);
  const parametersDefinition = getCompletionParametersDefinition(provider);

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
      const { parameters = {} } = selectedConversation;
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

  const system = selectedConversation?.system ?? model?.system ?? Opla.system;
  const selectedPolicy = selectedConversation?.contextWindowPolicy || DefaultContextWindowPolicy;

  return (
    <div className="scrollbar-trigger flex h-full w-full bg-neutral-100 dark:bg-neutral-900">
      <Tabs defaultValue="settings" className="w-full py-3">
        <div className="px-4">
          <TabsList className="justify-left w-full gap-4">
            <TabsTrigger value="settings">
              <Settings2 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="documents">
              <File className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="debug">
              <Bug className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="settings" className="h-full py-4">
          <ScrollArea className="h-full w-full px-4">
            <Accordion
              type="multiple"
              className="w-full"
              defaultValue={['settings-model', 'settings-appearance', 'settings-preset']}
            >
              <AccordionItem value="settings-model">
                <AccordionTrigger>{t('Preset')}</AccordionTrigger>
                <AccordionContent>Choose a default preset.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="settings-preset">
                <AccordionTrigger>{t('System')}</AccordionTrigger>
                <AccordionContent>
                  <Textarea
                    value={system}
                    onChange={handleSystemChange}
                    className="resize-none overflow-y-hidden border-0 bg-transparent p-2 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent"
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="settings-parameters">
                <AccordionTrigger>{t('Parameters')}</AccordionTrigger>
                <AccordionContent>
                  <Form<ConversationParameter>
                    id={selectedConversation?.id}
                    parameters={selectedConversation?.parameters}
                    parametersDefinition={parametersDefinition}
                    onParametersChange={updateParameters}
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="contextwindow-parameters">
                <AccordionTrigger>{t('Context window')}</AccordionTrigger>
                <AccordionContent>
                  <div className="flex w-full flex-row px-4 py-2">
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
                        <HelpCircle className="ml-2 h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="w-[265px] text-sm">{ContextWindowPolicies[selectedPolicy]}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <Parameter
                    title={t('Keep system')}
                    type="boolean"
                    name="keepSystem"
                    inputCss="max-w-20 pl-2"
                    value={isKeepSystem(selectedConversation)}
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
                <div className="text-xs">{t('ID')} :</div>
                <div className="mb-4 text-xs">{selectedConversation.id}</div>
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
          <Textarea
            value={selectedConversation?.note ?? ''}
            placeholder={t('Write a note...')}
            className="resize-none overflow-y-hidden border-0 bg-transparent p-2 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent"
            onChange={handleNoteChange}
          />
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
