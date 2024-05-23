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
import { BaseNamedRecord, Provider } from '@/types';

export default function Server({
  provider,
  onParameterChange,
}: {
  provider: Provider;
  onParameterChange: (name: string, value: ParameterValue) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-2 px-8 py-4 text-sm">
      <Parameter
        label={t('Name')}
        name="name"
        value={provider?.name}
        type="text"
        onChange={onParameterChange}
      />
      <Parameter
        label={t('Url')}
        name="url"
        value={provider?.url}
        type="text"
        onChange={onParameterChange}
      />
      <Parameter
        label={t('API key')}
        name="key"
        value={provider?.key}
        type="password"
        onChange={onParameterChange}
      />
      <Parameter
        label={t('Models')}
        name="models"
        value={provider?.models || ([] as BaseNamedRecord[])}
        type="array"
        onChange={onParameterChange}
      />
      <Parameter
        label={t('Documentation')}
        name="docUrl"
        value={provider?.docUrl}
        type="text"
        onChange={onParameterChange}
      />
      <Parameter
        label={t('Description')}
        name="description"
        value={provider?.description}
        type="large-text"
      />
    </div>
  );
}
