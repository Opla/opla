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

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import useDebounceFunc from '@/hooks/useDebounceFunc';

export type EditableItemProps = {
  id: string;
  title: string;
  className?: string;
  editable?: boolean;
  onChange?: (value: string, id: string) => void;
};

export default function EditableItem({
  id,
  title,
  className,
  editable = false,
  onChange,
}: EditableItemProps) {
  const [changedValue, setChangedValue] = useState<string | undefined>(undefined);

  const onDebouncedChange = (value: string) => {
    onChange?.(value, id);
  };

  useDebounceFunc<string>(onDebouncedChange, changedValue, 500);
  if (editable) {
    return (
      <Input
        type="text"
        className="line-clamp-1 h-auto w-full text-ellipsis border-none bg-transparent outline-none"
        value={changedValue || title}
        onChange={(e) => {
          e.preventDefault();
          setChangedValue(e.target.value);
        }}
      />
    );
  }
  return <div className={className}>{title}</div>;
}
