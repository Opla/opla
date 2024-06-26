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
import Dialog from '@/components/common/Modal';
import { NewLocalModel } from '@/features/Models';

function NewLocalModelDialog({
  id,
  open,
  onClose,
}: {
  id: string;
  open: boolean;
  onClose: () => void | undefined;
}) {
  const handleClose = () => {
    onClose();
  };

  const handleSelected = () => {
    onClose();
  };

  return (
    <Dialog id={id} size="md" open={open} onClose={handleClose}>
      <NewLocalModel className="w-full" onSelected={handleSelected} onClose={handleClose} />
    </Dialog>
  );
}

export default NewLocalModelDialog;
