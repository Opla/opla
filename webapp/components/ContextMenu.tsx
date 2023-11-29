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
import { useEffect, useRef } from 'react';
import useTranslation from '@/hooks/useTranslation';

function ContextMenu({
  menu,
  data,
  children,
}: {
  menu: MenuItem[];
  data: string;
  children: React.ReactNode;
}) {
  const contextContainer = useRef<HTMLDivElement>(null);
  const contextMenu = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const closeContextMenu = () => {
    contextMenu.current?.classList.add('hidden');
    document.body.classList.remove('modalbox-open');
  };

  useEffect(() => {
    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      if (contextMenu.current && contextContainer.current?.contains(e.target as Node)) {
        contextMenu.current.classList.remove('hidden');
        contextMenu.current.style.left = `${e.clientX}px`;
        contextMenu.current.style.top = `${e.clientY}px`;
        document.body.classList.add('modalbox-open');
      } else if (contextMenu.current) {
        contextMenu.current.classList.add('hidden');
        document.body.classList.remove('modalbox-open');
      }
    };
    window.addEventListener('contextmenu', handleRightClick);

    const handleCloseContextMenu = (e: MouseEvent) => {
      if (contextMenu.current && !contextMenu.current.contains(e.target as Node)) {
        contextMenu.current.classList.add('hidden');
        document.body.classList.remove('modalbox-open');
      }
    };
    window.addEventListener('click', handleCloseContextMenu);

    return () => {
      window.removeEventListener('contextmenu', handleRightClick);
      window.removeEventListener('click', handleCloseContextMenu);
    };
  });

  return (
    <>
      <div ref={contextContainer}>{children}</div>
      <div
        className="fixed z-10 hidden rounded-lg bg-gray-600 p-2 shadow-lg transition-all dark:bg-gray-900"
        ref={contextMenu}
      >
        <li className="modalbox p1 flex flex-1 flex-col">
          {menu.map((item) => (
            <ul
              key={item.label}
              className="cursor-pointer rounded-md px-2 py-2 text-gray-400 transition-colors duration-200 hover:bg-gray-500/10 hover:text-white dark:text-gray-400 hover:dark:text-white"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (item.onSelect) item.onSelect(data);
                  closeContextMenu();
                }}
                type="button"
              >
                {t(item.label)}
              </button>
            </ul>
          ))}
        </li>
      </div>
    </>
  );
}

export default ContextMenu;
