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
import React from 'react';
import { PromptTemplate } from '@/types';
import { cn } from '@/lib/utils';
import useFetch from '@/hooks/useFetch';
import PromptCard from '../../../common/PromptCard';

function PromptsGrid({
  className,
  assistantPrompts,
  onPromptSelected,
  disabled,
}: {
  className?: string;
  assistantPrompts: PromptTemplate[] | undefined;
  onPromptSelected: (prompt: PromptTemplate) => void;
  disabled: boolean;
}) {
  const [defaultPrompts] = useFetch<PromptTemplate[]>(
    'https://opla.github.io/prompts/default.json',
  );

  const prompts = assistantPrompts || defaultPrompts;

  return (
    <div
      className={cn('mr-4 grid grid-cols-1 gap-4 px-2 sm:grid-cols-2 md:grid-cols-3', className)}
    >
      {prompts?.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          disabled={disabled}
          onSelect={() => {
            onPromptSelected(prompt);
          }}
        />
      ))}
    </div>
  );
}

export default PromptsGrid;
