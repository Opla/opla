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
import React, { useState } from 'react';
import AlertDialog from '@/components/common/AlertDialog';
import useTranslation from '@/hooks/useTranslation';
import { Input } from '@/components/ui/input';
import { ModalData } from '@/context/modals';

type NewPresetDialogProps = {
  id: string;
  visible: boolean;
  data: ModalData;
  onClose: () => void | undefined;
};

function NewPresetDialog({ id, visible, data, onClose }: NewPresetDialogProps) {
  const { t } = useTranslation();

  const [value, setValue] = useState('');

  const handleDuplicate = (action: string) => {
    if (action === 'Duplicate' && value.length > 3) {
      data.onAction?.(action, { item: { name: value } });
      onClose();
    }
  };

  return (
    <AlertDialog
      id={id}
      title={t('Duplicate this preset?')}
      actions={[
        { label: t('Duplicate'), value: 'Duplicate', disabled: value.length < 4 },
        { label: t('Cancel'), value: 'Cancel' },
      ]}
      visible={visible}
      onClose={onClose}
      data={data}
      onAction={handleDuplicate}
    >
      <div>
        <div className="py-4">{t('Set a name for the new preset')}:</div>
        <Input
          value={value}
          placeholder={t('Preset name')}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    </AlertDialog>
  );
}

export default NewPresetDialog;
