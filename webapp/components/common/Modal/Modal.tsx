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

import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { BiX } from 'react-icons/bi';

export default function Modal({
  id,
  open,
  onClose,
  children,
  size,
}: {
  id?: string;
  open: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}) {
  const modalRef = useRef<HTMLDialogElement>(null);

  const handleDialogClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!document.body.classList.contains('modalbox-open') && target.nodeName === 'DIALOG') {
        event.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const dialog = modalRef;
    dialog.current?.addEventListener('click', handleDialogClick);
    if (open) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
    return () => {
      dialog.current?.removeEventListener('click', handleDialogClick);
    };
  }, [handleDialogClick, onClose, open]);

  let cssSize;
  switch (size) {
    case 'sm':
      cssSize = 'w-[30%] h-[30%]';
      break;
    case 'md':
      cssSize = 'w-[50%] h-[50%]';
      break;
    case 'lg':
      cssSize = 'w-[70%] h-[70%]';
      break;
    case 'xl':
      cssSize = 'w-[80%] h-[80%]';
      break;
    default:
      cssSize = ' ';
      break;
  }

  return (
    <dialog
      id={id}
      ref={modalRef}
      onCancel={onClose}
      className={`${cssSize} relative rounded-lg bg-white shadow-lg transition-all backdrop:bg-neutral-950/50 dark:bg-neutral-900`}
    >
      {children}
      <button
        aria-label="Close"
        className="absolute right-0 top-0 m-2"
        type="button"
        onClick={onClose}
      >
        <BiX className="h-6 w-6" />
      </button>
    </dialog>
  );
}
