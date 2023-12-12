// Copyright 2023 mik
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

// Copyright 2023 mik
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

import Parameter from '@/components/common/Parameter';
import useTranslation from '@/hooks/useTranslation';
import { Provider } from '@/types';
import { deepGet } from '@/utils/data';

export default function Opla({
  provider,
  onParameterChange,
}: {
  provider: Provider;
  onParameterChange: (name: string, value: string | boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-2 px-8 py-4 text-sm dark:bg-gray-900">
      <Parameter
        title={t('Description')}
        name="description"
        value={deepGet(provider, 'description')}
        disabled
        type="large-text"
      />
      <Parameter
        title={t('Local server')}
        name="metadata.server.name"
        value={deepGet(provider, 'metadata.server.name', '')}
        disabled
        type="text"
        onChange={onParameterChange}
      />
      <Parameter
        title={t('Host')}
        name="metadata.server.parameters.host"
        value={deepGet(provider, 'metadata.server.parameters.host', '')}
        type="text"
        onChange={onParameterChange}
      />
      <Parameter
        title={t('Port')}
        name="metadata.server.parameters.port"
        value={deepGet(provider, 'metadata.server.parameters.port', '')}
        type="text"
        onChange={onParameterChange}
      />
      <Parameter
        title={t('Context size')}
        name="metadata.server.parameters.contextSize"
        value={deepGet(provider, 'metadata.server.parameters.contextSize', '')}
        type="text"
        onChange={onParameterChange}
      />
      <Parameter
        title={t('Threads')}
        name="metadata.server.parameters.threads"
        value={deepGet(provider, 'metadata.server.parameters.threads', '')}
        type="text"
        onChange={onParameterChange}
      />
      <Parameter
        title={t('Number of GPU layers')}
        name="metadata.server.parameters.nGpuLayers"
        value={deepGet(provider, 'metadata.server.parameters.nGpuLayers', '')}
        type="text"
        onChange={onParameterChange}
      />
    </div>
  );
}
