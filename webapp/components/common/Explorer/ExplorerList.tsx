// Copyright 2024 mik
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

import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import ContextMenuList from '@/components/ui/ContextMenu/ContextMenuList';
import { BaseNamedRecord, Ui } from '@/types';

export type ExplorerListProps<T> = {
  selectedId?: string;
  items: T[];
  renderItem?: (item: T) => React.ReactNode;
  menu?: Ui.MenuItem[];
  onSelectItem?: (id: string) => void;
};

export default function ExplorerList<T>({
  selectedId,
  items,
  renderItem,
  menu,
  onSelectItem,
}: ExplorerListProps<T>) {
  const itemRendering = (item: BaseNamedRecord) => (
    <div
      aria-label="Select an item"
      role="button"
      onKeyDown={() => {}}
      onClick={(e) => {
        e.preventDefault();
        onSelectItem?.(item.id);
      }}
      className="w-full"
      tabIndex={0}
    >
      {renderItem?.(item as T) ?? item.name}
    </div>
  );

  return (
    <div className="flex-1 flex-col overflow-y-auto overflow-x-hidden dark:border-white/20">
      <div className="flex flex-col gap-2 pb-2 text-sm dark:text-neutral-100">
        <div className="group relative flex flex-col gap-3 break-all rounded-md px-1 py-3">
          <ul className="p1 flex flex-1 flex-col">
            {(items as BaseNamedRecord[]).map((item: BaseNamedRecord) => (
              <li
                key={item.id}
                className={`${
                  selectedId === item.id
                    ? 'text-black dark:text-white'
                    : 'text-neutral-400 dark:text-neutral-400'
                } rounded-md px-2 py-2 transition-colors duration-200 hover:bg-neutral-500/10`}
              >
                {menu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>{itemRendering(item)}</ContextMenuTrigger>
                    <ContextMenuList data={item.id} menu={menu} />
                  </ContextMenu>
                ) : (
                  itemRendering(item)
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
