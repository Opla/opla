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

import { Bot } from 'lucide-react';
import { Assistant } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import AvatarView from '@/components/common/AvatarView';

type AssistantTitleProps = {
  assistant: Assistant | undefined;
};

export default function AssistantTitle({ assistant }: AssistantTitleProps) {
  const { t } = useTranslation();

  return (
    <div className="flex grow items-center capitalize text-foreground">
      {assistant && (
        <AvatarView
          avatar={assistant.avatar}
          className="mr-2 h-4 w-4"
          icon={assistant.avatar ? undefined : <Bot className="h-4 w-4" strokeWidth={1.5} />}
        />
      )}
      <span>{assistant?.name ?? t('Assistant not found')}</span>{' '}
    </div>
  );
}
