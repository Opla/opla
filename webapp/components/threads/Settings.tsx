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
import { useContext, useState } from 'react';
import { File, HelpCircle, Palette, Settings2 } from 'lucide-react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import Parameter, { ParameterValue } from '../common/Parameter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';

export default function Settings({ conversationId }: { conversationId?: string }) {
  const { t } = useTranslation();
  const { conversations, updateConversations, providers } = useContext(AppContext);
  const { backendContext } = useBackend();
  const [params, setParams] = useState<{ [key: string]: ParameterValue | undefined }>({});

  // logger.info('backendContext', backendContext);
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

  const handleParameterChange = (name: string, _value?: ParameterValue) => {
    logger.info('handleParameterChange', name, _value);
    const parameterDef = parametersDefinition[name];
    let value = _value;
    const result = parameterDef.z.safeParse(value);
    if (String(value).length > 0 && !result.success) {
      if (parameterDef.type === 'number') {
        setParams({ ...params, [name]: value });
      } else {
        logger.error('handleParameterChange invalid', result.error);
        toast.error(result.error.message);
      }
      return;
    }
    if (result.success) {
      value = result.data;
    }
    if (params[name] !== undefined) {
      setParams({ ...params, [name]: undefined });
    }
    if (
      parameterDef.defaultValue === _value ||
      (parameterDef.defaultValue === undefined && _value === '')
    ) {
      value = undefined;
    }

    if (selectedConversation) {
      let { parameters } = selectedConversation;
      let newConversation: Conversation | undefined;
      if (value !== undefined) {
        parameters = { ...selectedConversation.parameters, [name]: value as ConversationParameter };
        newConversation = { ...selectedConversation, parameters };
      } else if (parameters?.[name] !== undefined) {
        delete parameters[name];
        newConversation = { ...selectedConversation, parameters };
      } else if (parameters && Object.keys(parameters).length === 0) {
        newConversation = { ...selectedConversation };
        delete newConversation.parameters;
      }
      if (newConversation) {
        const newConversations = updateConversation(newConversation, conversations, true);
        logger.info('onParameterChange save Parameters', value, parameters); // , params);
        updateConversations(newConversations);
      }
    }
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
                  {Object.keys(parametersDefinition).map((key) => (
                    <Parameter
                      key={key}
                      title={t(parametersDefinition[key].name)}
                      type={parametersDefinition[key].type}
                      name={key}
                      value={
                        selectedConversation?.parameters?.[key] ||
                        params[key] ||
                        parametersDefinition[key].defaultValue
                      }
                      description={t(parametersDefinition[key].description)}
                      inputCss="max-w-20 pl-2"
                      onChange={handleParameterChange}
                    />
                  ))}
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
      </Tabs>
    </div>
  );
}
