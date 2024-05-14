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

import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bot, SquarePen, Store } from 'lucide-react';
import AvatarView from '@/components/common/AvatarView';
import { ExplorerGroup, ExplorerList } from '@/components/common/Explorer';
import { Button } from '@/components/ui/button';
import useTranslation from '@/hooks/useTranslation';
import { useAssistantStore } from '@/stores';
import { Assistant, Ui } from '@/types';
import EmptyView from '@/components/common/EmptyView';

type AssistantsListProps = {
  selectedId?: string;
  closed?: boolean;
  onToggle?: () => void;
  onSelect?: (id: string) => void;
};

export default function AssistantsList({
  selectedId,
  closed,
  onToggle,
  onSelect,
}: AssistantsListProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { assistants, updateAssistant } = useAssistantStore();

  const handleEditAssistant = (assistantId: string) => {
    const route = Ui.Page.Assistants;
    router.push(`${route}/${assistantId}`);
  };

  const handleHideAssistant = (assistantId: string) => {
    const assistant = assistants.find((a) => a.id === assistantId) as Assistant;
    updateAssistant({ ...assistant, hidden: true });
    const currentAssistantId = searchParams?.get('assistant');
    if (currentAssistantId === assistantId) {
      router.replace(router.pathname, undefined, { shallow: true });
    }
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
    if (!assistant.readonly) {
      return menuMyAssistants;
    }
    return menu;
  };

  const StoreButton = (
    <Button variant="outline" size="sm" className="text-primary" asChild>
      <Link href={Ui.Page.Store}>
        <Store className="mr-2 h-4 w-4" strokeWidth={1.5} />
        {t('Explore the store')}
      </Link>
    </Button>
  );

  const filteredAssistants = useMemo(
    () => assistants.filter((assistant) => !assistant.hidden),
    [assistants],
  );

  const store = router.pathname === Ui.Page.Store;

  return (
    <ExplorerGroup
      title="Assistants"
      closed={closed}
      onToggle={onToggle}
      toolbar={!store && (filteredAssistants.length > 0 || closed) && StoreButton}
      className="h-full"
    >
      {filteredAssistants.length > 0 && (
        <ExplorerList<Assistant>
          selectedId={selectedId}
          items={filteredAssistants}
          getItemTitle={(assistant) => assistant.name}
          renderLeftSide={(assistant) => (
            <AvatarView
              avatar={assistant.avatar}
              className="h-4 w-4"
              icon={assistant.avatar ? undefined : <Bot className="h-4 w-4" strokeWidth={1.5} />}
            />
          )}
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
      )}
      {filteredAssistants.length === 0 && (
        <div className="h-full pb-8">
          <EmptyView
            title={t('No Assistants')}
            description={t(
              'Opt for a specialized AI agent or GPT to navigate and enhance your daily activities. These assistants can utilize both local models and external services like OpenAI, offering versatile support.',
            )}
            icon={<Bot className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />}
            className="h-full p-4"
          >
            {!store && StoreButton}
          </EmptyView>
        </div>
      )}
    </ExplorerGroup>
  );
}
