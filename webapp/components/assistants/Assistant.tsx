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

import { Bug, Settings2 } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { useAssistantStore } from '@/stores';
import RecordView from '../common/RecordView';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import Parameter, { ParameterValue } from '../common/Parameter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export type AssistantProps = {
  assistantId?: string;
};

export default function AssistantView({ assistantId }: AssistantProps) {
  const { t } = useTranslation();
  const { getAssistant, updateAssistant } = useAssistantStore();

  const assistant = getAssistant(assistantId);

  logger.info('Assistant', assistantId);

  const handleUpdateParameter = (name: string, value: ParameterValue) => {
    if (assistant) {
      updateAssistant({ ...assistant, [name]: value });
    }
  };

  return (
    <Tabs defaultValue="settings" className="h-full">
      <RecordView
        title={
          assistant ? (
            <div className="flex flex-row items-center gap-4">
              <div>{assistant.name}</div>
              <TabsList className="gap-4">
                <TabsTrigger value="settings">
                  <Settings2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {t('Settings')}
                </TabsTrigger>
                <TabsTrigger value="debug">
                  <Bug className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {t('Logs')}
                </TabsTrigger>
              </TabsList>
            </div>
          ) : (
            'Assistant'
          )
        }
        selectedId={assistantId}
        toolbar={
          assistantId && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  if (assistant) {
                    updateAssistant({ ...assistant, disabled: !assistant.disabled });
                  }
                }}
              >
                {assistant?.disabled ? t('Enable') : t('Disable')}
              </Button>
            </div>
          )
        }
      >
        {assistant && (
          <>
            <TabsContent value="settings" className="h-full">
              <ScrollArea className="h-full">
                <div className="flex flex-col items-center gap-2 px-8 py-4 text-sm">
                  <Parameter
                    title={t('Name')}
                    name="name"
                    value={assistant?.name}
                    type="text"
                    onChange={handleUpdateParameter}
                  />
                  <Parameter
                    title={t('Description')}
                    name="description"
                    value={assistant?.description}
                    type="large-text"
                    onChange={handleUpdateParameter}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="settings" className="h-full">
              <div>TODO</div>
            </TabsContent>
          </>
        )}
      </RecordView>
    </Tabs>
  );
}
