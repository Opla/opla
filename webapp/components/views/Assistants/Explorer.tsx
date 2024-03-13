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
import { useRouter } from 'next/router';
import { Plus } from 'lucide-react';
import logger from '@/utils/logger';
import { useAssistantStore } from '@/stores';
import { Assistant, Ui } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { ModalIds } from '@/modals';
import { ModalData, ModalsContext } from '@/context/modals';
import { BasicState, Page } from '@/types/ui';
import Explorer, { ExplorerList } from '../../common/Explorer';
import { Button } from '../../ui/button';
import AssistantIcon from '../../common/AssistantIcon';
import Pastille from '../../common/Pastille';

export default function AssistantsExplorer({
  selectedAssistantId,
}: {
  selectedAssistantId?: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { showModal } = useContext(ModalsContext);
  logger.info('AssistantsExplorer', selectedAssistantId);
  const { assistants, getAssistant, createAssistant, updateAssistant, deleteAssistant } =
    useAssistantStore();

  const handleSelectItem = (id: string) => {
    logger.info(`onSelectItem ${id}`);
    const route = Ui.Page.Assistants;
    router.push(`${route}/${id}`);
  };

  const handleToggle = (id: string) => {
    const assistant = getAssistant(id);
    if (assistant) {
      assistant.disabled = !assistant.disabled;
      updateAssistant(assistant);
    }
    logger.info(`onToggle ${id}`);
  };

  const handleDelete = async (action: string, data: ModalData) => {
    const { id } = data.item;
    if (action === 'Delete' && id) {
      logger.info(`onDelete ${id}`);
      deleteAssistant(id);
      if (selectedAssistantId && selectedAssistantId === id) {
        router.replace(Page.Assistants);
      }
    }
  };

  const handleToDelete = (id: string) => {
    logger.info(`onToDelete${id}`);
    const assistant = getAssistant(id);
    if (assistant) {
      showModal(ModalIds.DeleteItem, { item: assistant, onAction: handleDelete });
    }
  };

  const menu: Ui.MenuItem[] = [
    {
      label: t('Disable'),
      onSelect: (data: string) => {
        handleToggle(data);
      },
    },
    {
      label: t('Delete'),
      onSelect: handleToDelete,
    },
  ];
  const menuDisabled: Ui.MenuItem[] = [
    {
      label: t('Enable'),
      onSelect: (data: string) => {
        logger.info(`enable ${data}`);
        handleToggle(data);
      },
    },
    {
      label: t('Delete'),
      onSelect: handleToDelete,
    },
  ];

  return (
    <Explorer
      title="Assistants"
      toolbar={
        <Button
          aria-label={t('New Assistant')}
          title={t('New Assistant')}
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            const assistant = createAssistant(`Assistant ${assistants.length + 1}`);
            handleSelectItem(assistant.id);
          }}
        >
          <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
        </Button>
      }
    >
      <ExplorerList<Assistant>
        selectedId={selectedAssistantId}
        renderLeftSide={(a) => <AssistantIcon icon={a.avatar} name={a.name} className="h-6 w-6" />}
        items={assistants}
        renderRightSide={(a) => (
          <Pastille state={a.disabled ? BasicState.disabled : BasicState.active} />
        )}
        onSelectItem={handleSelectItem}
        menu={(assistant) => (assistant.disabled ? menuDisabled : menu)}
      />
    </Explorer>
  );
}
