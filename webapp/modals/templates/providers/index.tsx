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
import { Provider } from '@/types';

function ProviderCreate({
  provider,
  onParameterChange,
  advanced,
}: {
  provider: Partial<Provider>;
  onParameterChange: (name: string, value: ParameterValue) => void;
  advanced?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex w-full flex-col items-center gap-1 p-2 text-sm dark:bg-neutral-900">
      {!advanced && (
        <>
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
            label={t('Secret key')}
            name="key"
            value={provider?.key}
            type="text"
            onChange={onParameterChange}
          />
          <Parameter
            label={t('Models')}
            name="models"
            value={provider?.models}
            type="array"
            onChange={onParameterChange}
          />
        </>
      )}
      {advanced && (
        <>
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
        </>
      )}
    </div>
  );
}

export default ProviderCreate;
