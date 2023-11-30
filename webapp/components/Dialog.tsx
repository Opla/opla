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

// Experimenting with Dialog component
// Not fully implemented yet

import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { BiX } from 'react-icons/bi';

export default function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleDialogClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.nodeName === 'DIALOG') {
        event.stopPropagation();
        onClose();
      }
      event.preventDefault();
    },
    [onClose],
  );

  useEffect(() => {
    const dialog = dialogRef;
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

  return (
    <dialog ref={dialogRef} onCancel={onClose} className="backdrop:bg-gray-950/50">
      <div className="h-full w-full cursor-default rounded-lg bg-white shadow-lg transition-all dark:bg-gray-900">
        {children}
        <button
          aria-label="Close"
          className="absolute right-0 top-0 m-2"
          type="button"
          onClick={onClose}
        >
          <BiX className="h-6 w-6" />
        </button>
      </div>
    </dialog>
  );
}
