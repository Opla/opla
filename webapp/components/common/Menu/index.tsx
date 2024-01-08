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

import useTranslation from '@/hooks/useTranslation';
import { MenuItem } from '@/types';
import { IconType } from 'react-icons';
import { PiCheck } from 'react-icons/pi';

function Menu({
  items,
  data = '',
  onClose,
  onSelect = () => {},
}: {
  items: MenuItem[];
  data?: string;
  onClose: () => void;
  onSelect?: (value?: string, data?: string) => void;
}) {
  const { t } = useTranslation();
  const selection = items.length > 0 && 'selected' in items[0];
  return (
    <ul className="flex w-full flex-col">
      {items.map((item) => {
        const I = item.icon as IconType;
        return (
          <li
            key={item.label}
            className="w-full cursor-pointer rounded-md px-2 py-2 text-neutral-400 transition-colors duration-200 hover:bg-neutral-500/10 hover:text-white dark:text-neutral-400 hover:dark:text-white"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                if (item.onSelect) {
                  item.onSelect(data);
                }
                onSelect(item.value, data);
                onClose();
              }}
              type="button"
              className="flex w-full flex-row items-center"
            >
              {item.icon && <I className="mr-2 h-4 w-4" />}
              <p className="mr-4 flex-1 truncate text-left">{t(item.label)}</p>
              {selection && item.selected && <PiCheck className="ml-2 h-4 w-4" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default Menu;
