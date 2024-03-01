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
import { cn } from '@/lib/utils';
import EditableItem from '../EditableItem';

export type ExplorerListProps<T> = {
  selectedId?: string;
  items: T[];
  editable?: boolean;
  isEditable?: (item: T) => boolean;
  getItemTitle?: (item: T) => string;
  renderLeftSide?: (item: T) => React.ReactNode;
  renderItem?: (item: T) => React.ReactNode;
  renderRightSide?: (item: T) => React.ReactNode;
  menu?: (item: T) => Ui.MenuItem[];
  onSelectItem?: (id: string) => void;
  onChange?: (value: string, id: string) => void;
  className?: string;
};

export default function ExplorerList<T>({
  selectedId,
  items,
  editable,
  isEditable,
  getItemTitle,
  renderLeftSide,
  renderItem,
  renderRightSide,
  menu,
  onSelectItem,
  onChange,
  className,
}: ExplorerListProps<T>) {
  const itemClassName =
    'line-clamp-1 h-auto w-full flex-1 overflow-hidden text-ellipsis break-all px-3 py-1';
  const editableItemRendering = (item: BaseNamedRecord) => (
    <EditableItem
      id={item.id}
      title={getItemTitle?.(item as T) ?? item.name}
      titleElement={<span className="grow">{renderItem?.(item as T) ?? item.name}</span>}
      editable={isEditable?.(item as T) ?? editable}
      className={itemClassName}
      onChange={onChange}
    />
  );

  const itemRendering = (item: BaseNamedRecord) => (
    <div
      aria-label="Select an item"
      role="button"
      onKeyDown={() => {}}
      onClick={(e) => {
        e.preventDefault();
        onSelectItem?.(item.id);
      }}
      className="flex w-full cursor-pointer flex-row items-center justify-between gap-2"
      tabIndex={0}
    >
      <div className="flex grow flex-row items-center gap-2">
        {renderLeftSide?.(item as T)}
        {editable ? (
          editableItemRendering(item)
        ) : (
          <div className={className}>
            <span>{renderItem?.(item as T) ?? getItemTitle?.(item as T) ?? item.name}</span>
          </div>
        )}
      </div>
      {renderRightSide?.(item as T)}
    </div>
  );
  return (
    <div
      className={cn('flex-col overflow-y-auto overflow-x-hidden dark:border-white/20', className)}
    >
      <div className="flex flex-col gap-1 pb-2 text-sm dark:text-neutral-100">
        <div className="group relative flex flex-col break-all rounded-md px-1 py-3">
          <ul className="flex flex-col">
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
                    <ContextMenuList data={item.id} menu={menu(item as T)} />
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
