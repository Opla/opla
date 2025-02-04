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

import { SquarePen } from 'lucide-react';
import AvatarView from '@/components/common/AvatarView';
import { Button } from '@/components/ui/button';
import {
  CardButton,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import useTranslation from '@/hooks/useTranslation';
import { Assistant } from '@/types';

type AssistantCardProps = {
  assistant: Assistant;
  onInstall: (assistant: Assistant) => void;
};

function AssistantCard({ assistant, onInstall }: AssistantCardProps) {
  const { t } = useTranslation();

  return (
    <CardButton>
      <CardHeader className="h-[94px]">
        <div className="flex flex-row items-center gap-4">
          {assistant.avatar && <AvatarView avatar={assistant.avatar} />}
          <CardTitle className="line-clamp-3">{assistant.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex grow">
        <CardDescription className="line-clamp-5">{assistant.description}</CardDescription>
      </CardContent>
      <CardFooter className="pb-auto flex w-full justify-between">
        <p className="className='line-clamp-1' text-muted-foreground text-sm font-thin">
          {assistant.author?.url ? (
            <a href={assistant.author.url} target="_blank">
              {t('by')} {assistant.author?.name}
            </a>
          ) : (
            <span>
              {t('by')} {assistant.author?.name}
            </span>
          )}
        </p>
        <Button variant="ghost" size="icon">
          <SquarePen className="h-5 w-5" strokeWidth={1.5} onClick={() => onInstall(assistant)} />
        </Button>
      </CardFooter>
    </CardButton>
  );
}

export default AssistantCard;
