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

import { ChevronDown } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ExplorerGroupProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
  toolbar?: React.ReactNode;
};

function ExplorerGroup({ title, children, toolbar, className }: ExplorerGroupProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('group flex w-full flex-col', className)}>
      <div className="flex w-full items-center">
        <Button variant="ghost" size="iconSm">
          <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <div className="flex w-full flex-grow items-center justify-between gap-1 overflow-hidden p-0 pl-2">
          {title && (
            <div className="text-ellipsis break-all capitalize text-muted-foreground">
              {t(title)}
            </div>
          )}
          {toolbar}
        </div>
      </div>
      {children}
    </div>
  );
}

export default ExplorerGroup;
