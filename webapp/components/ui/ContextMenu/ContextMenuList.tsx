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

import { Ui } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { ContextMenuContent, ContextMenuItem } from '../context-menu';

function ContextMenuList({ menu, data }: { menu: Ui.MenuItem[]; data: string }) {
  const { t } = useTranslation();
  return (
    <ContextMenuContent className="w-64">
      {menu.map((item) => (
        <ContextMenuItem
          key={item.label}
          className="cursor-pointer"
          onSelect={() => {
            item.onSelect?.(data);
          }}
          inset
        >
          {t(item.label)}
        </ContextMenuItem>
      ))}
    </ContextMenuContent>
  );
}

export default ContextMenuList;
