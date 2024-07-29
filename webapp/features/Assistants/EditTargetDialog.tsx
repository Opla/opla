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

import { useMemo, useState } from 'react';
import { BrainCircuit, Settings2 } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import { Preset, Model, Provider, Logo } from '@/types';
import { findModelInAll, getModelsAsItems } from '@/utils/data/models';
import logger from '@/utils/logger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EditPreset from '@/features/EditPresets';
import { findProvider, getLocalProvider } from '@/utils/data/providers';
import { TooltipProvider } from '@/components/ui/tooltip';
import ModelIcon from '@/components/common/ModelIcon';
import { useModelsStore, useProviderStore } from '@/stores';
import AlertDialog from '../../components/common/AlertDialog';
import Parameter, { ParameterValue } from '../../components/common/Parameter';
import Combobox from '../../components/common/Combobox';
import LabelParameter from '../../components/common/LabelParameter';

type EditTargetDialogProps = {
  id: string;
  visible: boolean;
  data: any;
  onClose: () => void | undefined;
};

function EditTargetDialog({ id, visible, onClose, data }: EditTargetDialogProps) {
  const { t } = useTranslation();
  const { providers } = useProviderStore();
  const modelStorage = useModelsStore();
  const modelItems = useMemo(
    () => getModelsAsItems(providers, modelStorage),
    [providers, modelStorage],
  ).map((m) => ({
    ...m,
    icon: undefined,
    renderIcon: () => (
      <ModelIcon
        icon={m.icon as unknown as Logo}
        name={m.label}
        className="h-4 w-4"
        providerName={m.group?.toLowerCase()}
      />
    ),
  }));
  const [newParameters, setNewParameters] = useState<Record<string, ParameterValue>>({});
  const target = data?.item as Preset;
  const { title, isNew, targetName } = useMemo(() => {
    let newTitle = 'Edit target';
    const isNewNew = !target.name;
    let name = target?.name || '';
    if (isNewNew) {
      newTitle = 'New target';
    } else if (target.name === '#duplicate') {
      newTitle = 'Duplicate target';
      name = '';
    }
    return { title: newTitle, isNew: isNewNew, targetName: name };
  }, [target]);

  const isDisabled = !(
    (newParameters.name || targetName) &&
    (newParameters.models || target.models)
  );

  let model: Model | undefined;
  let provider: Provider | undefined;
  const modelName = (newParameters?.models as string[] | undefined)?.[0] || target.models?.[0];
  if (modelName) {
    model = findModelInAll(modelName, providers, modelStorage);
    provider = target.provider
      ? findProvider(target?.provider, providers)
      : getLocalProvider(providers);
  }
  const handleChange = (name: string, value: ParameterValue) => {
    setNewParameters({ ...newParameters, [name]: value });
  };

  const handleAction = (action: string) => {
    if (action !== 'Cancel') {
      data.onAction(action, { item: { ...target, ...newParameters } });
    }
    onClose();
  };

  const handleSelectModel = (value?: string, index?: number) => {
    if (value && index !== undefined) {
      logger.info('handleSelectModel', value, index, modelItems[index]);
      const item = modelItems[index];
      setNewParameters({ ...newParameters, provider: item.group || 'None', models: [value] });
    }
  };

  const handlePresetChange = (newPartialTarget: Partial<Preset>) => {
    const keys = Object.keys(newPartialTarget);
    const params = { ...newParameters };
    keys.forEach((key) => {
      params[key] = newPartialTarget[key as keyof typeof newPartialTarget] as ParameterValue;
    });
    setNewParameters(params);
  };

  return (
    <AlertDialog
      id={id}
      title={t(title)}
      size="lg"
      actions={[
        { label: isNew ? t('Create') : t('Save'), value: 'Update', disabled: isDisabled },
        { label: t('Cancel'), value: 'Cancel', variant: 'outline' },
      ]}
      visible={visible}
      onClose={onClose}
      data={data}
      onAction={handleAction}
    >
      <TooltipProvider>
        <Tabs>
          <TabsList className="justify-left w-full gap-4">
            <TabsTrigger value="config">
              <BrainCircuit className="h-4 w-4" strokeWidth={1.5} />
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings2 className="h-4 w-4" strokeWidth={1.5} />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="config" className="h-full py-4">
            <LabelParameter label={t('Name')} className="space-y-0">
              <Parameter
                placeholder={t('Insert target name...')}
                inputCss="w-full"
                name="name"
                value={newParameters.name || targetName || ''}
                onChange={handleChange}
              />
            </LabelParameter>

            <LabelParameter label={t('Model')}>
              <Combobox
                items={modelItems}
                selected={(newParameters.models as string[])?.[0] || target.models?.[0]}
                onSelect={handleSelectModel}
                className="w-full bg-transparent"
                placeholder="Select a model..."
                portal={false}
              />
            </LabelParameter>
          </TabsContent>
          <TabsContent value="settings" className="h-full py-4">
            <EditPreset<Preset>
              presetProperties={{ ...target, ...newParameters }}
              provider={provider}
              model={model}
              portal={false}
              onChange={handlePresetChange}
            />
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </AlertDialog>
  );
}

export default EditTargetDialog;
