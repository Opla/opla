// Copyright 2023 Mik Bry
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

'use client';

import { Ui } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ModalData } from '@/context/modals';

export default function AlertDialog({
  id,
  title,
  visible,
  children,
  actions,
  onAction,
  onClose,
  data,
}: {
  id: string;
  title: string;
  visible: boolean;
  children: React.ReactNode;
  actions?: Ui.MenuItem[];
  onAction?: (action: string, data: ModalData) => void;
  onClose?: (data: ModalData) => void;
  data?: any;
}) {
  const handlePreAction = (action: string, doAction: (action: string, data: ModalData) => void) => {
    doAction?.(action, data);
    onClose?.(data);
  };

  return (
    <Dialog
      id={id}
      open={visible}
      size="sm"
      onClose={() => {
        onClose?.(data);
      }}
    >
      <div className="flex h-full w-full flex-col gap-3 p-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogContent>{children}</DialogContent>
        <DialogFooter>
          {actions?.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant={action.variant || 'default'}
              disabled={action.disabled}
              onClick={(e) => {
                e.preventDefault();
                handlePreAction(action.value || action.label, onAction || data?.onAction);
              }}
            >
              {action.label}
            </Button>
          ))}
        </DialogFooter>
      </div>
    </Dialog>
  );
}
