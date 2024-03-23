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

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { SquarePen, Store } from 'lucide-react';
import AvatarView from '@/components/common/AvatarView';
import { ExplorerGroup, ExplorerList } from '@/components/common/Explorer';
import Opla from '@/components/icons/Opla';
import { Button } from '@/components/ui/button';
import useTranslation from '@/hooks/useTranslation';
import { useAssistantStore } from '@/stores';
import { Assistant, Ui } from '@/types';
import { OplaAssistant } from '@/stores/assistants';

type AssistantsListProps = {
  selectedId?: string;
  onSelect?: (id: string) => void;
};

export default function AssistantsList({ selectedId, onSelect }: AssistantsListProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { getAllAssistants, updateAssistant } = useAssistantStore();
  const [assistants, setAssistants] = useState<Assistant[]>(getAllAssistants());

  const handleEditAssistant = (assistantId: string) => {
    const route = Ui.Page.Assistants;
    router.push(`${route}/${assistantId}`);
  };

  const handleHideAssistant = (assistantId: string) => {
    const assistant = assistants.find((a) => a.id === assistantId) as Assistant;
    updateAssistant({ ...assistant, hidden: true });
    const newAssistants = getAllAssistants();
    setAssistants(newAssistants);
  };

  const menuMyAssistants: Ui.MenuItem[] = [
    {
      label: t('Edit'),
      onSelect: handleEditAssistant,
    },
    {
      label: t('Hide'),
      onSelect: handleHideAssistant,
    },
  ];

  const menu: Ui.MenuItem[] = [
    {
      label: t('Hide'),
      onSelect: handleHideAssistant,
    },
  ];

  const getMenu = (assistant: Assistant) => {
    if (assistant.id === OplaAssistant.id) {
      return [];
    }
    if (!assistant.readonly) {
      return menuMyAssistants;
    }
    return menu;
  };

  return (
    <ExplorerGroup
      title="Assistants"
      toolbar={
        <Button variant="outline" size="sm" className="text-primary" asChild>
          <Link href="/threads/store">
            <Store className="mr-2 h-4 w-4" strokeWidth={1.5} />
            {t('Explore the store')}
          </Link>
        </Button>
      }
    >
      <ExplorerList<Assistant>
        selectedId={selectedId || OplaAssistant.id}
        items={assistants}
        getItemTitle={(assistant) =>
          assistant.id === OplaAssistant.id ? t('Use your local AI Models') : assistant.name
        }
        renderLeftSide={(assistant) =>
          assistant.id === OplaAssistant.id ? (
            <Opla className="h-4 w-4" />
          ) : (
            <AvatarView avatar={assistant.avatar} className="h-4 w-4" />
          )
        }
        renderRightSide={(assistant) =>
          assistant.disabled !== true && (
            <Button variant="ghost" size="iconSm" asChild>
              <SquarePen className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          )
        }
        onSelectItem={onSelect}
        menu={(assistant) => getMenu(assistant)}
      />
    </ExplorerGroup>
  );
}