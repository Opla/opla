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

import { Button } from '@/components/ui/button';
import { PromptTemplate } from '@/types';

export default function PromptCard({
  prompt,
  selected,
  disabled = false,
  onSelect,
}: {
  prompt: PromptTemplate;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const cssTitle = prompt.title ? '' : 'bg-muted';
  const cssDesc = prompt.description ? '' : 'bg-muted';
  const container = (
    <div className="m-2 flex flex-col gap-2 p-3">
      <div className={`${cssTitle} w-full text-sm font-bold`}>{prompt.title}</div>
      <p
        className={`${cssDesc} dark:text-muted-foreground-dark text-muted-foreground line-clamp-3 w-full text-xs text-balance`}
      >
        {prompt.description}
      </p>
    </div>
  );
  return onSelect && !disabled ? (
    <Button
      asChild
      variant="outline"
      onClick={onSelect}
      className="bg-muted m-2 h-full w-full cursor-pointer overflow-hidden"
    >
      {container}
    </Button>
  ) : (
    <div
      className={`${
        selected ? 'border-primary border' : ''
      } border-muted m-2 h-full w-full overflow-hidden rounded border`}
    >
      {container}
    </div>
  );
}
