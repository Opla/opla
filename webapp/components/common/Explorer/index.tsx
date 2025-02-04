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

import useTranslation from '@/hooks/useTranslation';
import { Separator } from '@/components/ui/separator';
import { isMac } from '@/utils/misc';
import { cn } from '@/lib/utils';
import ExplorerList from './ExplorerList';
import ExplorerGroup from './ExplorerGroup';
import Searchbar from '../Searchbar';

export type ExplorerProps = {
  icon?: React.ReactNode;
  isSearching?: boolean;
  searchQuery?: string;
  searchPlaceholder?: string;
  title?: string;
  children?: React.ReactNode;
  toolbar?: React.ReactNode;
  onCancelSearch?: () => void;
  onSearchQuery?: (query: string | undefined) => void;
};

export default function Explorer({
  icon,
  isSearching = false,
  searchQuery,
  searchPlaceholder,
  title = '',
  children,
  toolbar,
  onSearchQuery,
  onCancelSearch,
}: ExplorerProps) {
  const { t } = useTranslation();

  const isTitlebarTransparent = isMac();
  return (
    <div className="bg-secondary/70 flex h-full w-full flex-1 items-start border-r-[1px]">
      <nav className="flex h-full flex-1 flex-col">
        <div className="flex w-full items-center">
          <div
            className="overflow:visible flex h-11 grow items-center px-2"
            data-tauri-drag-region={isTitlebarTransparent}
          >
            {!isSearching && (
              <>
                {icon}
                <h1
                  className={cn(
                    'text-l flex-1 font-extrabold',
                    isTitlebarTransparent ? 'ml-6' : undefined,
                  )}
                  data-tauri-drag-region={isTitlebarTransparent}
                >
                  {t(title)}
                </h1>
                {toolbar}
              </>
            )}
            {isSearching && (
              <Searchbar
                query={searchQuery}
                onQuery={onSearchQuery}
                onCancel={onCancelSearch}
                placeholder={searchPlaceholder}
              />
            )}
          </div>
        </div>
        <Separator />
        {children}
      </nav>
    </div>
  );
}

export { ExplorerList, ExplorerGroup };
