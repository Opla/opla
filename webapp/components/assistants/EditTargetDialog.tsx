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

import { useContext, useMemo, useState } from 'react';
import useBackend from '@/hooks/useBackendContext';
import useTranslation from '@/hooks/useTranslation';
import { AssistantTarget } from '@/types';
import { AppContext } from '@/context';
import { getModelsAsItems } from '@/utils/data/models';
import logger from '@/utils/logger';
import AlertDialog from '../common/AlertDialog';
import Parameter, { ParameterValue } from '../common/Parameter';
import Combobox from '../common/Combobox';
import LabelParameter from '../common/LabelParameter';

type EditTargetDialogProps = {
  id: string;
  visible: boolean;
  data: any;
  onClose: () => void | undefined;
};

function EditTargetDialog({ id, visible, onClose, data }: EditTargetDialogProps) {
  const { t } = useTranslation();
  const { providers } = useContext(AppContext);
  const { backendContext } = useBackend();
  const modelItems = useMemo(
    () => getModelsAsItems(providers, backendContext),
    [providers, backendContext],
  );
  const [newParameters, setNewParameters] = useState<Record<string, ParameterValue>>({});
  const target = data?.item as AssistantTarget;
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
      logger.info('handleSelectModel', value, index, modelItems[index as number]);
      const item = modelItems[index as number];
      setNewParameters({ ...newParameters, provider: item.group || 'None', models: [value] });
    }
  };

  return (
    <AlertDialog
      id={id}
      title={t(title)}
      actions={[
        { label: isNew ? t('Create') : t('Save'), value: 'Update', disabled: isDisabled },
        { label: t('Cancel'), value: 'Cancel', variant: 'outline' },
      ]}
      visible={visible}
      onClose={onClose}
      data={data}
      onAction={handleAction}
    >
      <div>
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
      </div>
    </AlertDialog>
  );
}

export default EditTargetDialog;
