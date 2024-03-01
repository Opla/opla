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

import { SquarePen, Store } from 'lucide-react';
import AssistantIcon from '@/components/common/AssistantIcon';
import { ExplorerGroup, ExplorerList } from '@/components/common/Explorer';
import Opla from '@/components/icons/Opla';
import { Button } from '@/components/ui/button';
import useTranslation from '@/hooks/useTranslation';
import { useAssistantStore } from '@/stores';
import { Assistant } from '@/types';
import { OplaAssistant } from '@/stores/assistants';

type AssistantsListProps = {
  selectedId?: string;
};

export default function AssistantsList({ selectedId }: AssistantsListProps) {
  const { t } = useTranslation();
  const { getAllAssistants } = useAssistantStore();
  const assistants = getAllAssistants();
  return (
    <ExplorerGroup
      title="Assistants"
      toolbar={
        <Button variant="outline" size="sm">
          <Store className="mr-2 h-4 w-4" strokeWidth={1.5} />
          {t('Explore the store')}
        </Button>
      }
    >
      <ExplorerList<Assistant>
        selectedId={selectedId || OplaAssistant.id}
        items={assistants}
        renderLeftSide={(assistant) =>
          assistant.id === OplaAssistant.id ? (
            <Opla className="h-4 w-4" />
          ) : (
            <AssistantIcon icon={assistant.icon} name={assistant.name} className="h-4 w-4" />
          )
        }
        renderRightSide={(assistant) =>
          assistant.disabled !== true && (
            <Button variant="ghost" size="iconSm" asChild>
              <SquarePen className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          )
        }
      />
    </ExplorerGroup>
  );
}
