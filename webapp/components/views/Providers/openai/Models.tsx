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

import useTranslation from '@/hooks/useTranslation';
import { Model, Provider } from '@/types';
import { useEffect, useState } from 'react';
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

type OpenAIModelsProps = {
  provider: Provider;
};

export default function OpenAIModels({ provider }: OpenAIModelsProps) {
  const { t } = useTranslation();
  const [models, setModels] = useState<(Model & { selected?: boolean })[]>([]);
  useEffect(() => {
    const afunc = async () => {
      const response = await listModels(provider);
      setModels(
        response.models
          .filter((m) => m.id.startsWith('gpt'))
          .map((m) => ({ ...m, selected: !!provider.models?.find((pm) => pm.id === m.id) })),
      );
    };
    afunc();
  }, [provider]);
  console.log('models', models);

  const handleSelectModel = (selectedModel: Model) => {
    logger.info('selected Model', selectedModel);
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
