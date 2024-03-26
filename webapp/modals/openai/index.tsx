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

import React from 'react';
import Dialog from '@/components/common/Modal';
import OpenAI from '@/components/views/Providers/openai';
import useBackend from '@/hooks/useBackendContext';
import useProviderState from '@/hooks/useProviderState';
import { Provider } from '@/types';
import { ModalData } from '@/context/modals';
import OpenAIProvider from '@/utils/providers/openai';

function OpenAIDialog({
  id,
  data,
  open,
  onClose,
}: {
  id: string;
  data: ModalData;
  open: boolean;
  onClose: () => void | undefined;
}) {
  const newProvider = data.item as Provider;
  const { getActiveModel, setActiveModel } = useBackend();
  const { provider, onParametersSave, onParameterChange } = useProviderState(
    newProvider?.id,
    newProvider,
  );

  const handleClose = () => {
    onClose();
  };

  const handleSave = () => {
    onParametersSave({ disabled: false });
    if (!getActiveModel() && provider?.id) {
      const model = OpenAIProvider.template.models?.[0].id as string;
      setActiveModel(model, provider?.id);
    }
    handleClose();
  };

  return (
    <Dialog id={id} size="md" open={open} onClose={handleClose}>
      {provider && (
        <OpenAI
          provider={provider}
          className="w-full"
          onParameterChange={onParameterChange}
          onSave={handleSave}
        />
      )}
    </Dialog>
  );
}

export default OpenAIDialog;
