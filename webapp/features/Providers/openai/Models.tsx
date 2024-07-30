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

import { useEffect, useState } from 'react';
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
import ModelIcon from '@/components/common/ModelIcon';
import { cn } from '@/lib/utils';
import { useProviderStore } from '@/stores';

type OpenAIModelsProps = {
  provider: Provider;
  className?: string;
  containerClassName?: string;
  formClassName?: string;
  title?: string;
};

type SelectedModel = Model & { selected?: boolean };

export default function OpenAIModels({
  provider,
  className,
  containerClassName,
  formClassName,
  title = 'Available models',
}: OpenAIModelsProps) {
  const { t } = useTranslation();
  const { providers, setProviders } = useProviderStore();
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
    logger.info('updatedModels', updatedModels, updatedModel);
  };

  return (
    <div className={cn('h-full pb-16 pt-4', containerClassName)}>
      {models.length > 0 && (
        <form className={cn('h-full w-full items-start gap-6 pt-8', formClassName)}>
          <fieldset className="grid h-full gap-6 rounded-lg border p-4">
            <legend className="-ml-1 px-1 text-sm font-medium">{t(title)}</legend>
            <Table
              className=""
              containerClassname={cn('overflow-y-scroll', className || 'h-[400px]')}
            >
              <TableHeader className="sticky top-0 z-50 bg-secondary">
                <TableRow>
                  <TableHead className="w-1/7 px-2 py-1">{t('Select')}</TableHead>
                  <TableHead className="w-2/7 px-2 py-1">{t('Model')}</TableHead>
                  <TableHead className="w-3/7 px-2 py-1">{t('Description')}</TableHead>
                  <TableHead className="w-1/7 px-2 py-1">{t('Context window')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="h-full">
                {models.map((model) => (
                  <TableRow onClick={() => {}} key={model.id || model.name} className="">
                    <TableCell className="px-2 py-1 text-center">
                      <Checkbox
                        disabled={isLoading}
                        checked={model.selected}
                        onCheckedChange={() => handleSelectModel(model)}
                      />
                    </TableCell>
                    <TableCell className="truncate px-2 py-1">
                      <div className="flex items-center gap-2">
                        <ModelIcon
                          icon={model.icon}
                          name={model.name}
                          className="h-4 w-4"
                          providerName={model.creator}
                        />
                        {model.name}
                      </div>
                    </TableCell>
                    <TableCell className="line-clamp-4 px-2 py-1">{model.description}</TableCell>
                    <TableCell className="px-2 py-1 text-right">
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
