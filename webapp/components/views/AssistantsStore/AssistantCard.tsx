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

import AvatarView from '@/components/common/AvatarView';
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
};

function AssistantCard({ assistant }: AssistantCardProps) {
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
      <CardFooter className="pb-auto">
        <p className="className='line-clamp-1' text-sm font-thin text-muted-foreground">
          {t('by')} {assistant.author?.name}
        </p>
      </CardFooter>
    </CardButton>
  );
}

export default AssistantCard;
