// Copyright 2023 mik
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

import { useState } from 'react';
import { MenuItem } from '@/types';
import Modal from './Modal';

export default function Dialog({
  title,
  children,
  actions,
  onAction,
}: {
  title: string;
  children: React.ReactNode;
  actions?: MenuItem[];
  onAction?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const onPreAction = (action: () => void) => {
    action?.();
    setOpen(false);
  };

  return (
    <Modal
      id="dialog"
      open={open}
      size="sm"
      onClose={() => {
        setOpen(false);
      }}
    >
      <div className="flex h-full w-full flex-col gap-3 p-4">
        <div className="mb-4 text-lg font-bold">{title}</div>
        <div className="relative flex-auto">{children}</div>
        <div className="flex flex-shrink-0 flex-row-reverse gap-3">
          {actions?.map((action) => (
            <button
              key={action.label}
              type="button"
              className="rounded-md bg-gray-500 px-4 py-2 text-white"
              onClick={(e) => {
                e.preventDefault();
                onPreAction(onAction as () => void);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
