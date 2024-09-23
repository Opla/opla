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

import Parameter, { ParameterValue } from '@/components/common/Parameter';
import useTranslation from '@/hooks/useTranslation';
import useBackend from '@/hooks/useBackendContext';
import { Provider, ServerStatus } from '@/types';
import { deepGet } from '@/utils/data';
import SelectModel from '@/components/common/SelectModel';
import { getLocalModels, getLocalModelsAsItems } from '@/utils/data/models';
import { getServerConfig, setActiveModel } from '@/utils/backend/commands';
import { LllamaCppParameterDefinitions } from '@/utils/providers/llama.cpp/constants';
import { useModelsStore, useServerStore } from '@/stores';
import { getCommandLineOptions } from '@/utils/providers/llama.cpp';

export default function Opla({
  provider,
  onParameterChange,
}: {
  provider: Provider;
  onParameterChange: (name: string, value: ParameterValue) => void;
}) {
  const { t } = useTranslation();
  const { server, restart } = useBackend();
  const modelStorage = useModelsStore();
  const { serverConfig: config } = useServerStore();
  const models = getLocalModels(modelStorage);
  const modelId = config.parameters.modelId as string;
  const selectedModel = models.find((m) => m.id === modelId || m.fileName === modelId);
  const modelPath = config.parameters.modelPath as string;
  const items = getLocalModelsAsItems(modelStorage, selectedModel?.id);
  const changeActiveModel = async (modelIdOrName: string) => {
    await setActiveModel(modelIdOrName);
    if (server.status === ServerStatus.STARTED || server.status === ServerStatus.STARTING) {
      const { parameters } = await getServerConfig();
      await restart(parameters);
    }
  };

  const disabled = server.status === ServerStatus.STARTING;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <form className="grid w-full items-start gap-6 overflow-auto pt-4">
        <fieldset className="grid gap-6 rounded-lg border p-4">
          <div className="flex w-full items-center justify-between px-4 py-2">
            {t('Active model')}
            <SelectModel
              disabled={disabled}
              selectedModel={selectedModel}
              modelItems={items}
              onSelectModel={changeActiveModel}
            />
          </div>
        </fieldset>
      </form>
      <form className="grid w-full items-start gap-6 overflow-auto pt-8">
        <fieldset className="grid gap-6 rounded-lg border p-4">
          <legend className="-ml-1 px-1 text-sm font-medium">{t('Local server')}</legend>
          <Parameter
            label={t('Description')}
            name="description"
            value={t(deepGet<Provider, string>(provider, 'description') as string)}
            disabled
            type="large-text"
          />
          <Parameter
            label={t('Inference engine')}
            name="metadata.server.name"
            value={`${deepGet(provider, 'metadata.server.name', 'llama.cpp')} ${getCommandLineOptions(modelPath, provider.metadata?.server?.parameters || {})}`}
            disabled
            type="text"
            onChange={onParameterChange}
          />
        </fieldset>
      </form>
      <form className="grid w-full items-start gap-6 overflow-auto pb-20 pt-8">
        <fieldset className="grid gap-6 rounded-lg border p-4">
          <legend className="-ml-1 px-1 text-sm font-medium">{t('Parameters')}</legend>
          {LllamaCppParameterDefinitions.map((def) => (
            <Parameter
              key={`llama_${def.name}`}
              label={t(def.label || def.name)}
              name={`metadata.server.parameters.${def.name}`}
              value={
                def.name === 'model'
                  ? modelPath
                  : deepGet(provider, `metadata.server.parameters.${def.name}`, def.defaultValue)
              }
              type={def.type}
              disabled={def.disabled}
              onChange={onParameterChange}
              description={def.description}
            />
          ))}
        </fieldset>
      </form>
    </div>
  );
}
