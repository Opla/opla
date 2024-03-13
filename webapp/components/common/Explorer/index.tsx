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
import { Separator } from '@/components/ui/separator';
import ExplorerList from './ExplorerList';
import ExplorerGroup from './ExplorerGroup';

export type ExplorerProps = {
  icon?: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
  toolbar?: React.ReactNode;
};

export default function Explorer({ icon, title = '', children, toolbar }: ExplorerProps) {
  const { t } = useTranslation();

  return (
    <div className="scrollbar-trigger flex h-full w-full flex-1 items-start border-r-[1px] bg-secondary/70">
      <nav className="flex h-full flex-1 flex-col space-y-1">
        <div className="flex w-full items-center">
          <div className="flex grow items-center p-2">
            {icon}
            <h1 className="text-l flex-1 font-extrabold">{t(title)}</h1>
            {toolbar}
          </div>
        </div>
        <Separator />
        {children}
      </nav>
    </div>
  );
}

export { ExplorerList, ExplorerGroup };
