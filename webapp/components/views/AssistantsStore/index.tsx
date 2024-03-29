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

import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { ResizablePanel } from '@/components/ui/resizable';
import { ArrowLeftCircle, Search } from 'lucide-react';
import useBackend from '@/hooks/useBackendContext';
import { Assistant, Model, Ui } from '@/types';
import { getAssistantsCollection, getModelsCollection } from '@/utils/backend/commands';
import useTranslation from '@/hooks/useTranslation';
import { getEntityName } from '@/utils/data';
import { useAssistantStore } from '@/stores';
import { installModelFromApi } from '@/utils/data/models';
import { toast } from '@/components/ui/Toast';
import logger from '@/utils/logger';
import { DefaultModelId, DefaultPageSettings } from '@/utils/constants';
import { Button } from '@/components/ui/button';
import Threads from '../Threads/Threads';
import { InputIcon } from '../../ui/input-icon';
import AssistantCard from './AssistantCard';
import ToolbarTogglePanels from '../Threads/ToolbarTogglePanels';

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
  const router = useRouter();
  const { backendContext, updateBackendStore, setSettings } = useBackend();
  const [collection, setCollection] = useState<Assistant[]>([]);
  const [query, setQuery] = useState<string>('');
  const { t } = useTranslation();

  const defaultSettings = backendContext.config.settings;
  const pageSettings = defaultSettings.pages?.[`${Ui.Page.Threads}/store`] || DefaultPageSettings;

  const handleExplorerHidden = (hidden: boolean) => {
    const { settings } = backendContext.config;
    const { pages = {} } = settings;
    pages[`${Ui.Page.Threads}/store`] = { ...pageSettings, explorerHidden: !hidden };
    setSettings({ ...settings, pages });
  };

  const { getAssistant, createAssistant, updateAssistant } = useAssistantStore();

  const installAssistant = async (assistant: Assistant) => {
    let newAssistant = getAssistant(assistant.id);
    if (!newAssistant) {
      const { targets = [] } = assistant;
      const allModels = backendContext.config.models.items;
      if (targets.length) {
        // TODO install first target model if not present
      }

      if (allModels.length === 0) {
        const collections = (await getModelsCollection()) as unknown as { models: Model[] };
        const model = collections.models.find((m) => m.id === DefaultModelId);
        if (model) {
          try {
            await installModelFromApi(model);
            await updateBackendStore();
          } catch (e) {
            const error = `Can't install ${model?.name} model`;
            logger.info(error);
            toast.error(error);
          }
        }
      }
      newAssistant = createAssistant(assistant.name, { ...assistant, targets, readonly: true });
    } if (newAssistant.hidden) {
      newAssistant.hidden = false;
      updateAssistant(newAssistant);
    }
    router.push(`${Ui.Page.Threads}/?assistant=${assistant.id}`);
  };

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
    <Threads onSelectMenu={() => {}} onShouldDelete={() => {}} onResizeExplorer={() => {}}>
      <ResizablePanel id="assistant-store">
        <div className="flex w-full p-4">
          <Button variant="ghost" onClick={() => router.push(Ui.Page.Threads)} size="icon">
            <ArrowLeftCircle className="" strokeWidth={1.5} />
          </Button>
          <ToolbarTogglePanels
            displayExplorer={!pageSettings.explorerHidden}
            onChangeDisplayExplorer={handleExplorerHidden}
            disabledSettings
          />
        </div>
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
            <AssistantCard key={assistant.id} assistant={assistant} onInstall={installAssistant} />
          ))}
        </div>
      </ResizablePanel>
    </Threads>
  );
}

export default AssistantsStore;
