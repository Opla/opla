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
import React from 'react';
import { Prompt } from '@/types';
import { cn } from '@/lib/utils';
import PromptCard from '../common/PromptCard';

function PromptsGrid({
  className,
  onPromptSelected,
}: {
  className?: string;
  onPromptSelected: (prompt: Prompt) => void;
}) {
  const prompts: Prompt[] = [
    {
      id: '1',
      name: 'Introduction',
      description: 'Introduce yourself and your interests.',
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      title: 'Introduction',
      prompt: 'Hi, my name is [Your Name]. I am interested in [Your Interests].',
    },
    {
      id: '2',
      name: 'Favorite Book',
      description: 'Share your favorite book and why you love it.',
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      title: 'Favorite Book',
      prompt: 'My favorite book is [Book Title]. I love it because [Reason].',
    },
    {
      id: '3',
      name: 'Dream Vacation',
      description: 'Describe your dream vacation destination.',
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      title: 'Dream Vacation',
      prompt:
        'My dream vacation destination is [Destination]. I would love to visit because [Reason].',
    },
    {
      id: '4',
      name: 'Hobby',
      description: 'Tell us about your favorite hobby.',
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      title: 'Hobby',
      prompt: 'My favorite hobby is [Hobby]. I enjoy it because [Reason].',
    },
    {
      id: '5',
      name: 'Future Goals',
      description: 'Share your aspirations and future goals.',
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      title: 'Future Goals',
      prompt: 'My future goals include [Goals]. I am excited to achieve them because [Reason].',
    },
    {
      id: '6',
      name: 'Favorite Movie',
      description: 'Discuss your all-time favorite movie.',
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      title: 'Favorite Movie',
      prompt: 'My all-time favorite movie is [Movie Title]. I love it because [Reason].',
    },
  ];

  return (
    <div className={cn('mr-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3', className)}>
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          onSelect={() => {
            onPromptSelected(prompt);
          }}
        />
      ))}
    </div>
  );
}

export default PromptsGrid;
