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

import { useRouter } from 'next/router';
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
import { Assistant, Ui } from '@/types';
import { useAssistantStore } from '@/stores';


type AssistantCardProps = {
  assistant: Assistant;
};

function AssistantCard({ assistant }: AssistantCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    getAssistant,
    createAssistant,
    createTarget,
  } = useAssistantStore();

  const handleStartChat = () => {
    console.log('Start chat with assistant');
    let newAssistant = getAssistant(assistant.id);
    if (!newAssistant) {
      newAssistant = createAssistant(assistant.name, { ...assistant, readonly: true });
    }
    if (!newAssistant.targets || newAssistant.targets.length === 0) {
      newAssistant.targets = [createTarget()];
    }
    router.push(`${Ui.Page.Threads}/?assistant=${assistant.id}`);
  };

  return (
    <CardButton onClick={handleStartChat}>
      <CardHeader className="h-[94px]">
        <div className="flex flex-row items-center gap-4">
          {assistant.avatar && <AvatarView avatar={assistant.avatar} />}
          <CardTitle className="line-clamp-3">{assistant.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex grow">
        <CardDescription className="line-clamp-5">{assistant.description}</CardDescription>
      </CardContent>
      <CardFooter className="pb-auto w-full flex justify-between">
        <p className="className='line-clamp-1' text-sm font-thin text-muted-foreground">
          {t('by')} {assistant.author?.name}
        </p>
        <Button variant="outline" size="iconSm"><SquarePen className="h-4 w-4" strokeWidth={1.5} /></Button>
      </CardFooter>
    </CardButton>
  );
}

export default AssistantCard;
