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

import { useMemo, useState } from 'react';
import useTranslation from '@/hooks/useTranslation';
import { BaseNamedRecord } from '@/types';
import AlertDialog from '../common/AlertDialog';
import Parameter, { ParameterValue } from '../common/Parameter';

type EditTargetDialogProps = {
  id: string;
  visible: boolean;
  data: any;
  onClose: () => void | undefined;
};

function EditTargetDialog({ id, visible, onClose, data }: EditTargetDialogProps) {
  const { t } = useTranslation();
  const [newParameters, setNewParameters] = useState<Record<string, ParameterValue>>({});
  const target = data?.item as BaseNamedRecord;
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
  const isDisabled = !(newParameters.name || targetName);
  const handleChange = (name: string, value: ParameterValue) => {
    setNewParameters({ ...newParameters, [name]: value });
  };

  const handleAction = (action: string) => {
    if (action !== 'Cancel') {
      data.onAction(action, { item: { ...target, ...newParameters } });
    }
    onClose();
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
        <Parameter
          placeholder={t('Insert target name...')}
          inputCss="w-full"
          name="name"
          value={newParameters.name || targetName || ''}
          onChange={handleChange}
        />
      </div>
    </AlertDialog>
  );
}

export default EditTargetDialog;
