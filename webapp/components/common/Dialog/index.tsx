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

import { MenuItem } from '@/types';
import Modal from '../Modal/Modal';

export default function Dialog({
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
  actions?: MenuItem[];
  onAction?: (action: string, data: any) => void;
  onClose?: (data: any) => void;
  data?: any;
}) {
  const onPreAction = (action: string, doAction: (action: string, data: any) => void) => {
    doAction?.(action, data);
    onClose?.(data);
  };

  return (
    <Modal
      id={id}
      open={visible}
      size="sm"
      onClose={() => {
        onClose?.(data);
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
              className="rounded-md bg-neutral-500 px-4 py-2 text-white"
              onClick={(e) => {
                e.preventDefault();
                onPreAction(
                  action.value || action.label,
                  onAction || (data?.onAction as () => void),
                );
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
