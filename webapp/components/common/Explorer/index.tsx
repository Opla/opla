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

import useTranslation from '@/hooks/useTranslation';
import ExplorerList from './ExplorerList';

export type ExplorerProps = {
  icon?: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
};

export default function Explorer({ icon, title = '', children }: ExplorerProps) {
  const { t } = useTranslation();

  return (
    <div className="scrollbar-trigger flex h-full w-full flex-1 items-start border-r-[1px] border-neutral-300/30 bg-neutral-100 dark:border-neutral-900 dark:bg-neutral-800/70">
      <nav className="flex h-full flex-1 flex-col space-y-1">
        <div className="flex w-full items-center dark:bg-neutral-800">
          <div className="flex grow items-center p-2">
            {icon}
            <p className="flex-1 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              {t(title)}
            </p>
          </div>
        </div>
        {children}
      </nav>
    </div>
  );
}

export { ExplorerList };
