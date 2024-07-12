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
import { LucideIcon } from 'lucide-react';
import {
  Select,
  SelectContentExt,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ui } from '@/types';
import { cn } from '@/lib/utils';
import useTranslation from '@/hooks/useTranslation';

export default function SelectBox({
  items,
  placeholder,
  className,
  onSelect,
}: {
  items: Ui.MenuItem[];
  placeholder?: string;
  className?: string;
  onSelect: (value?: string, data?: string) => void;
}) {
  const { t } = useTranslation();
  const selectedItem = items.find((item) => item.selected);
  return (
    <Select defaultValue={selectedItem?.value} onValueChange={onSelect}>
      <SelectTrigger className={cn('capitalize', className)}>
        <SelectValue placeholder={t(placeholder || 'Select an item')} />
      </SelectTrigger>
      <SelectContentExt>
        {items.map((item) => {
          const I = item.icon as LucideIcon;
          return (
            <SelectItem key={item.key} value={item.value as string} className="capitalize">
              <div className="mx-2 flex items-center">
                {I && <I className="mr-2 h-4 w-4" strokeWidth={1.5} />}
                {t(item.label)}
              </div>
            </SelectItem>
          );
        })}
      </SelectContentExt>
    </Select>
  );
}
