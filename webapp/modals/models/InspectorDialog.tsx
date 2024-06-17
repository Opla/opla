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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Dialog from '@/components/common/Modal';
import useTranslation from '@/hooks/useTranslation';
import { ModalData } from '@/context/modals';
import ModelFileInspector from '@/features/Models/ModelFileInspector';

function InspectorModelDialog({
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
  const modelId = data?.item.id as string;
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog id={id} size="lg" open={open} onClose={handleClose}>
      <Card className="flex h-full w-full flex-col overflow-hidden bg-transparent">
        <CardHeader className="flex-none">
          <CardTitle>{t('Model File Inspector')}</CardTitle>
        </CardHeader>
        <CardContent className="h-[72%] px-4 py-0" style={{ height: '72%' }}>
          <ModelFileInspector modelId={modelId} />
        </CardContent>
      </Card>
    </Dialog>
  );
}

export default InspectorModelDialog;
