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
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useTranslation from '@/hooks/useTranslation';
import { ExternalLink } from 'lucide-react';

export default function OpenAICard() {
  const { t } = useTranslation();
  return (
    <Card className="flex h-full w-[350px] flex-col">
      <CardHeader className="flex-none">
        <CardTitle>{t('Configure OpenAI ChatGPT')}</CardTitle>
        <CardDescription className="pt-3">
          {t('Connect to ChatGPT 3.5 or 4 using OpenAI API.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grow">
        <div className="grid h-full w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="name">{t('API key')}</Label>
            <Input id="name" placeholder={t('Your secret API key')} />
          </div>
          <div className="flex flex-col space-y-1.5">
            <p>{t('Where do I find my Secret API Key?')}</p>
            <p>
              {t(
                'You can find or create your Secret API key in your OpenAI User settings. You need an OpenAI platform account.',
              )}
            </p>
            <a
              href="https://beta.openai.com/account/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center pt-8 underline hover:text-neutral-500"
            >
              <span>{t('Go to OpenAI Platform')}</span>
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-none justify-between">
        <Button variant="outline">{t('Cancel')}</Button>
        <Button>{t('Save')}</Button>
      </CardFooter>
    </Card>
  );
}
