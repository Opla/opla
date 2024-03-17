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

import { useEffect, useMemo, useState } from 'react';
import { ResizablePanel } from '@/components/ui/resizable';
import { Search } from 'lucide-react';
import { Assistant } from '@/types';
import { getAssistantsCollection } from '@/utils/backend/commands';
import useTranslation from '@/hooks/useTranslation';
import { getEntityName } from '@/utils/data';
import Threads from '../Threads/Threads';
import { InputIcon } from '../../ui/input-icon';
import AssistantCard from './AssistantCard';

const search = (query: string, assistant: Assistant) => {
  const q = query.toLowerCase();
  return (
    assistant.name.toLowerCase().indexOf(q) > -1 ||
    (assistant.author && getEntityName(assistant.author).toLowerCase().indexOf(q) > -1) ||
    (assistant.description && assistant.description.toLowerCase().indexOf(q) > -1) ||
    (assistant.tags && assistant.tags.some((keyword) => keyword.toLowerCase().indexOf(q) > -1))
  );
};

function AssistantsStore() {
  const [collection, setCollection] = useState<Assistant[]>([]);
  const [query, setQuery] = useState<string>('');
  const { t } = useTranslation();

  useEffect(() => {
    const getCollection = async () => {
      const { assistants } = (await getAssistantsCollection()) as unknown as {
        assistants: Assistant[];
      };
      setCollection(assistants);
    };
    getCollection();
  }, []);

  const filteredCollection = useMemo(
    () => collection.filter((assistant) => search(query, assistant)),
    [collection, query],
  );
  return (
    <Threads onSelectMenu={() => {}}>
      <ResizablePanel>
        <div className="container px-40 py-20 text-center">
          <h2 className="mx-auto my-2 text-4xl font-extrabold md:text-3xl">
            {t('Assistants Store')}
          </h2>
          <h3 className="pb-4 text-lg font-normal text-muted-foreground">
            {t('Discover and use the perfect GPT agent for your needs.')}
          </h3>
          <InputIcon
            startIcon={Search}
            className=""
            placeholder="Search assistants, GPTs, agents by name, description or keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-4 gap-4 px-40">
          {filteredCollection.map((assistant) => (
            <AssistantCard key={assistant.id} assistant={assistant} />
          ))}
        </div>
      </ResizablePanel>
    </Threads>
  );
}

export default AssistantsStore;
