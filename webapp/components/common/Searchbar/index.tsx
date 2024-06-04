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

import { ChangeEvent } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useTranslation from '@/hooks/useTranslation';

type SearchbarProps = {
  query?: string | undefined;
  placeholder?: string;
  onCancel?: () => void;
  onQuery?: (query: string | undefined) => void;
};

export default function Searchbar({
  query,
  placeholder,
  onQuery = () => {},
  onCancel = () => {},
}: SearchbarProps) {
  const { t } = useTranslation();
  const handleQuery = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (value !== query) {
      onQuery(value);
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 p-1">
        <Button size="icon" variant="ghost" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <div className="flex w-full items-center gap-2 rounded-md border border-input px-2 focus-within:border-transparent focus-within:ring-1 focus-within:ring-ring">
          <Search strokeWidth={1.5} className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={handleQuery}
            placeholder={placeholder ? t(placeholder) : undefined}
            className="focus-visible:ring-none m-0 flex-1 overflow-hidden border-none p-0 shadow-none focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0"
            autoFocus
          />
          <Button size="icon" variant="ghost">
            <X className="h-4 w-4" strokeWidth={1.5} onClick={() => onQuery(undefined)} />
          </Button>
        </div>
      </div>
    </div>
  );
}
