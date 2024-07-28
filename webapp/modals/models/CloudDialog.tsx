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

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Dialog from '@/components/common/Modal';
import OpenAIModels from '@/features/Providers/openai/Models';
import useProviderState from '@/hooks/useProviderState';
import useTranslation from '@/hooks/useTranslation';
import { Provider } from '@/types';
import { ModalData } from '@/context/modals';
import { useProviderStore } from '@/stores';

function CloudModelDialog({
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
  const { t } = useTranslation();
  const { providers } = useProviderStore();
  let selectedProvider: Provider | undefined = data?.item as Provider;
  if (!selectedProvider) {
    selectedProvider = providers.find((p) => p.name === 'OpenAI');
  }
  const { provider } = useProviderState(selectedProvider?.id, selectedProvider);

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog id={id} size="lg" open={open} onClose={handleClose}>
      {provider && provider.name === 'OpenAI' && (
        <Card className="flex h-full w-full flex-col overflow-hidden bg-transparent">
          <CardHeader className="flex-none">
            <CardTitle>{t('Choose cloud models')}</CardTitle>
            <CardDescription className="">{t('Models to chat with.')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[72%] px-4 py-0" style={{ height: '72%' }}>
            <OpenAIModels
              provider={provider}
              className="h-[100%]"
              containerClassName="px-4 py-0"
              formClassName="p-0"
              title="OpenAI"
            />
          </CardContent>
        </Card>
      )}
    </Dialog>
  );
}

export default CloudModelDialog;
