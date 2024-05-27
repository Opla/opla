// Copyright 2023 Mik Bry
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
// Copyright 2023 Mik Bry
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

import { useContext, useEffect, useState } from 'react';
import { AppContext } from '@/context';
import useTranslation from '@/hooks/useTranslation';
import { Model, Provider } from '@/types';
import { listModels } from '@/utils/providers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import logger from '@/utils/logger';
import { updateProvider } from '@/utils/data/providers';
import { deepCopy } from '@/utils/data';

type OpenAIModelsProps = {
  provider: Provider;
};

type SelectedModel = Model & { selected?: boolean };

export default function OpenAIModels({ provider }: OpenAIModelsProps) {
  const { t } = useTranslation();
  const { providers, setProviders } = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<SelectedModel[]>([]);
  useEffect(() => {
    const afunc = async () => {
      setIsLoading(true);
      const response = await listModels(provider);
      setModels(
        response.models
          .filter((m) => m.id.startsWith('gpt'))
          .map((m) => ({ ...m, selected: !!provider.models?.find((pm) => pm.id === m.id) })),
      );
      setIsLoading(false);
    };
    /* if (isLoading) {
        return;
    } */
    afunc();
  }, [provider]);
  console.log('models', models);

  const handleSelectModel = (selectedModel: SelectedModel) => {
    logger.info('selected Model', selectedModel);
    const { models: providerModels = [] } = provider;
    let updatedModels: Model[] | undefined;
    const updatedModel = { ...selectedModel };
    delete updatedModel.selected;
    if (selectedModel.selected) {
      updatedModels = providerModels.filter((m) => m.id !== selectedModel.id);
    } else if (providerModels.findIndex((m) => m.id === selectedModel.id) === -1) {
      updatedModels = deepCopy(providerModels);
      updatedModels.push(updatedModel);
    }
    if (updatedModels) {
      const seen: Record<string, boolean> = {};
      updatedModels = updatedModels.filter((m) => {
        const dup = seen[m.id] || false;
        seen[m.id] = true;
        return !dup;
      });
      const updatedProviders = updateProvider({ ...provider, models: updatedModels }, providers);
      setProviders(updatedProviders);
    }
    console.log('updatedModels', updatedModels, updatedModel);
  };

  return (
    <div className="pb-16 pt-4">
      {models.length > 0 && (
        <form className="grid w-full items-start gap-6 overflow-auto pt-8">
          <fieldset className="grid gap-6 rounded-lg border p-4">
            <legend className="-ml-1 px-1 text-sm font-medium">{t('Models available')}</legend>
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Select')}</TableHead>
                  <TableHead>{t('Model')}</TableHead>
                  <TableHead>{t('Description')}</TableHead>
                  <TableHead>{t('Context window')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow onClick={() => {}} key={model.id || model.name}>
                    <TableCell className="truncate">
                      <Checkbox
                        disabled={isLoading}
                        checked={model.selected}
                        onCheckedChange={() => handleSelectModel(model)}
                      />
                    </TableCell>
                    <TableCell className="truncate">{model.name}</TableCell>
                    <TableCell className="line-clamp-4">{model.description}</TableCell>
                    <TableCell className="truncate">
                      <span>{model.contextWindow || t('N/A')}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </fieldset>
        </form>
      )}
    </div>
  );
}
