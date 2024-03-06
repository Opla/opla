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
import { HelpCircle } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { AppContext } from '@/context';
import Opla from '@/utils/providers/opla';
import { getCompletionParametersDefinition } from '@/utils/providers';
import { ContextWindowPolicy, Model, Preset, PresetParameter, Provider } from '@/types';
import { toast } from '@/components/ui/Toast';
import { ContextWindowPolicies, DefaultContextWindowPolicy } from '@/utils/constants';
import { findCompatiblePreset, getCompletePresetProperties } from '@/utils/data/presets';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/accordion';
import { ScrollArea } from '../../ui/scroll-area';
import { Textarea } from '../../ui/textarea';
import Parameter, { ParameterValue, ParametersRecord } from '../Parameter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';
import Form from '../Form';
import Presets from './Presets';

export default function EditPreset<T>({
  presetProperties,
  provider,
  model,
  onChange,
}: {
  presetProperties: Partial<Preset>;
  provider: Provider | undefined;
  model: Model | undefined;
  onChange: (newpreset: T) => void;
}) {
  const { t } = useTranslation();
  const { presets } = useContext(AppContext);
  const parametersDefinition = getCompletionParametersDefinition(provider);
  const modelName = presetProperties?.model ?? model?.name;
  const preset = findCompatiblePreset(presetProperties?.preset, presets, modelName, provider);
  const {
    parameters = {},
    system = presetProperties?.system ?? model?.system ?? Opla.system,
    keepSystem,
    contextWindowPolicy: selectedPolicy = DefaultContextWindowPolicy,
  } = getCompletePresetProperties(preset, presetProperties, presets);

  const handleSystemChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    if (presetProperties) {
      onChange({ ...presetProperties, system: value } as T);
    }
  };

  const updateParameters = async (
    id: string | undefined,
    params: ParametersRecord,
  ): Promise<ParametersRecord | undefined> => {
    let newParams: ParametersRecord | undefined;
    if (id && presetProperties) {
      let newPreset: Partial<Preset> | undefined;
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
        if (presetProperties.parameters && Object.keys(parameters).length === 0) {
          newPreset = { ...presetProperties };
          delete newPreset.parameters;
        } else {
          newPreset = { ...presetProperties, parameters };
        }
        onChange(newPreset as T);
      }
    }
    return newParams;
  };

  const handlePolicyChange = (policy: ContextWindowPolicy) => {
    if (presetProperties) {
      onChange({ ...presetProperties, contextWindowPolicy: policy } as T);
    }
  };

  const handleKeepSystemChange = (name: string, value: ParameterValue) => {
    if (presetProperties) {
      onChange({ ...presetProperties, keepSystem: value as boolean } as T);
    }
  };

  const handleChangePreset = (newPreset: string) => {
    if (presetProperties) {
      onChange({ ...presetProperties, preset: newPreset } as T);
    }
  };

  return (
    <ScrollArea className="h-full w-full px-4">
      <Presets
        preset={preset}
        presetProperties={presetProperties}
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
              id={presetProperties?.id}
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
  );
}
