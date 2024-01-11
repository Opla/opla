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
import { BrainCircuit, File, Palette, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';

export default function Settings({ conversationId }: { conversationId?: string }) {
  const { t } = useTranslation();
  // TODO: implement it
  logger.info('Settings', conversationId);

  return (
    <div className="scrollbar-trigger flex h-full w-full bg-neutral-100 px-4 dark:bg-neutral-800/70">
      <Tabs defaultValue="model" className="w-full py-3">
        <TabsList className="justify-left w-full gap-4">
          <TabsTrigger value="model">
            <BrainCircuit className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="documents">
            <File className="h-4 w-4" />
          </TabsTrigger>
          <div>
            <DotsVerticalIcon />
          </div>
        </TabsList>
        <TabsContent value="model" className="py-4">
          <ScrollArea className="w-full">
            <div className="h-[400px]">Choose your model here.</div>
            <Accordion
              type="multiple"
              className="h-[200px] w-full"
              defaultValue={['settings-model-openai']}
            >
              <AccordionItem value="settings-model-openai">
                <AccordionTrigger>OpenAI ChatGPT</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-2 p-2">
                    <Label>{t('Enter your API key to use it')}</Label>
                    <Input placeholder="API key" />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className="flex flex-col gap-2 p-2">
              <Button variant="outline" className="dark:bg-transparent" asChild>
                <Link href="/providers">{t('Configure other AI Providers')}</Link>
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="settings" className="py-4">
          <ScrollArea className="w-full">
            <Accordion
              type="multiple"
              className="w-full"
              defaultValue={['settings-model', 'settings-appearance', 'settings-preset']}
            >
              <AccordionItem value="settings-model">
                <AccordionTrigger>Preset</AccordionTrigger>
                <AccordionContent>Choose a default preset.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="settings-preset">
                <AccordionTrigger>System</AccordionTrigger>
                <AccordionContent>Type the system prompt.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="settings-appearance">
                <AccordionTrigger>Advanced</AccordionTrigger>
                <AccordionContent>context overflow and others.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="appearance">Thread / Document view</TabsContent>
        <TabsContent value="documents">
          <Textarea
            placeholder={t('Write a note...')}
            className="resize-none overflow-y-hidden border-0 bg-transparent p-2 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
