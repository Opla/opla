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

import { useContext } from 'react';
import { Bug, Plus, Settings2, Target } from 'lucide-react';
import useTranslation from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { useAssistantStore } from '@/stores';
import { openFileDialog } from '@/utils/backend/tauri';
import { ModalData, ModalsContext } from '@/context/modals';
import { ModalIds } from '@/modals';
import { AITarget } from '@/types';
import ContentView from '../../common/ContentView';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import Parameter, { ParameterValue } from '../../common/Parameter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import AssistantIcon from '../../common/AssistantIcon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import EmptyView from '../../common/EmptyView';
import TargetsTable from './TargetsTable';

export type AssistantProps = {
  assistantId?: string;
};

export default function AssistantView({ assistantId }: AssistantProps) {
  const { t } = useTranslation();
  const {
    getAssistant,
    updateAssistant,
    createTarget,
    updateTarget,
    duplicateTarget,
    deleteTarget,
  } = useAssistantStore();
  const { showModal } = useContext(ModalsContext);

  const assistant = getAssistant(assistantId);

  const handleChangeIcon = async () => {
    logger.info('Change icon');
    const file = await openFileDialog(
      false,
      [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }],
      true,
    );
    if (typeof file === 'string') {
      logger.info('File', file);
      if (assistant) {
        updateAssistant({ ...assistant, icon: { url: file } });
      }
    }
  };

  const handleUpdateParameter = (name: string, value: ParameterValue) => {
    if (assistant) {
      updateAssistant({ ...assistant, [name]: value });
    }
  };

  const handleUpdateTarget = async (action: string, data: ModalData) => {
    if (assistant) {
      const target = data.item as AITarget;
      updateTarget(assistant, target);
    }
  };

  const handleCreateTarget = () => {
    logger.info('Create target');
    if (assistant) {
      const newTarget = createTarget();
      showModal(ModalIds.EditTarget, { item: newTarget, onAction: handleUpdateTarget });
    }
  };

  const handleEditTarget = (target: AITarget) => {
    logger.info('Edit target');
    if (assistant) {
      showModal(ModalIds.EditTarget, { item: target, onAction: handleUpdateTarget });
    }
  };

  const handleDuplicateTarget = (target: AITarget) => {
    logger.info('Duplicate target');
    if (assistant) {
      const newTarget = duplicateTarget({ ...target, name: '#duplicate' });
      showModal(ModalIds.EditTarget, { item: newTarget, onAction: handleUpdateTarget });
    }
  };

  const handleDeleteTarget = async (action: string, data: ModalData) => {
    logger.info('Delete target', action);
    if (action === 'Delete' && assistant && data.item.id) {
      deleteTarget(assistant, data.item.id);
    }
  };

  const handleToDeleteTarget = (target: AITarget) => {
    logger.info('Delete target');
    if (assistant) {
      showModal(ModalIds.DeleteItem, { item: target, onAction: handleDeleteTarget });
    }
  };

  return (
    <Tabs defaultValue="settings" className="h-full">
      <ContentView
        header={
          assistant ? (
            <div className="flex flex-row items-center gap-4">
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
              <div>{assistant.name}</div>
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
            <TabsContent value="settings" className="m-0 h-full p-0">
              <ScrollArea className="h-full px-8 py-4">
                <div className="flex h-full flex-col gap-2 pb-16 text-sm">
                  <Card>
                    <CardHeader>
                      <div className="flex w-full flex-row gap-4">
                        <Button
                          variant="ghost"
                          className="h-16 w-16 p-2"
                          onClick={handleChangeIcon}
                        >
                          <AssistantIcon
                            icon={assistant.icon}
                            name={assistant.name}
                            className="h-full w-full"
                          />
                        </Button>
                        <Parameter
                          name="name"
                          value={assistant?.name}
                          type="text"
                          onChange={handleUpdateParameter}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Parameter
                        label={t('Description')}
                        name="description"
                        value={assistant?.description}
                        type="large-text"
                        onChange={handleUpdateParameter}
                      />

                      <Parameter
                        label={t('Version')}
                        name="version"
                        value={assistant?.version}
                        type="text"
                        onChange={handleUpdateParameter}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('System')}</CardTitle>
                      <CardDescription>{t('Default system configuration.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Parameter
                        name="system"
                        value={assistant?.system}
                        type="large-text"
                        onChange={handleUpdateParameter}
                      />
                    </CardContent>
                  </Card>
                  <Card className="min-h-[400px]">
                    <CardHeader className="flex w-full flex-row items-center">
                      <div className="grow">
                        <CardTitle>{t('Targets')}</CardTitle>
                        <CardDescription>Deploy your assistant to.</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleCreateTarget}>
                        <Plus className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {(!assistant.targets || assistant.targets.length === 0) && (
                        <EmptyView
                          title={t('No target associated')}
                          description={t('You have not added any targets. Add one below.')}
                          icon={<Target className="h-16 w-16 text-muted" />}
                          buttonLabel={t('Add a target')}
                          onCreateItem={handleCreateTarget}
                        />
                      )}
                      {assistant.targets && (
                        <TargetsTable
                          targets={assistant.targets}
                          onEdit={handleEditTarget}
                          onDuplicate={handleDuplicateTarget}
                          onDelete={handleToDeleteTarget}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="settings" className="h-full w-full">
              <div>TODO</div>
            </TabsContent>
          </>
        )}
      </ContentView>
    </Tabs>
  );
}
