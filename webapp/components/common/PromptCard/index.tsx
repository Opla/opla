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
import { Prompt } from '@/types';

export default function PromptCard({
  prompt,
  selected,
  disabled = false,
  onSelect,
}: {
  prompt: Prompt;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const cssTitle = prompt.title ? '' : 'bg-neutral-300/50 dark:bg-neutral-600/50 ';
  const cssDesc = prompt.description ? '' : 'bg-neutral-300/50 dark:bg-neutral-600/50 ';
  const container = (
    <div className="flex flex-col gap-2 p-3 m-2">
      <div className={`${cssTitle} w-full text-sm font-bold`}>{prompt.title}</div>
      <p className={`${cssDesc} w-full text-balance line-clamp-3 text-xs text-neutral-700 dark:text-neutral-400`}>
        {prompt.description}
      </p>
    </div>
  );
  return onSelect && !disabled ? (
    <Button asChild variant="outline" onClick={onSelect} className="cursor-pointer m-2 h-full w-full overflow-hidden ">
      {container}
    </Button>
  ) : (
    <div
      className={`${
        selected ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
      } m-2 h-full w-full overflow-hidden rounded bg-neutral-100 dark:bg-neutral-700`}
    >
      {container}
    </div>
  );
}
