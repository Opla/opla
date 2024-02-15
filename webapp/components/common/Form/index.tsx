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

import { useState } from 'react';
import { ParametersDefinition } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import useDebounceFunc from '@/hooks/useDebounceFunc';
import logger from '@/utils/logger';
import Parameter, { ParameterValue, ParametersRecord } from '../Parameter';

export type FormProps<T> = {
  parameters: Record<string, T> | undefined;
  parametersDefinition: ParametersDefinition;
  debounceDelay?: number;
  onParametersChanged: (params: ParametersRecord) => ParametersRecord | undefined;
};

export default function Form<T>({
  parameters,
  parametersDefinition,
  onParametersChanged,
  debounceDelay = 600,
}: FormProps<T>) {
  const [updatedParameters, setUpdatedParameters] = useState<ParametersRecord | undefined>(
    undefined,
  );
  const { t } = useTranslation();

  const handleParameterChange = (name: string, value?: ParameterValue) => {
    logger.info('handleParameterChange', name, value);
    const newParams = updatedParameters || {};
    if (newParams[name] !== value) {
      setUpdatedParameters({ ...newParams, [name]: value });
    }
  };

  const updateParameters = (newParameters: ParametersRecord) => {
    logger.info('updateParameters', newParameters);
    let changedParameters = onParametersChanged(newParameters);
    if (changedParameters && Object.keys(changedParameters).length === 0) {
      changedParameters = undefined;
    }
    // TODO handle errors
    setUpdatedParameters(changedParameters);
  };

  useDebounceFunc<ParametersRecord>(updateParameters, updatedParameters, debounceDelay);

  return (
    <form>
      {Object.keys(parametersDefinition).map((key) => (
        <Parameter
          key={key}
          title={t(parametersDefinition[key].name)}
          type={parametersDefinition[key].type}
          name={key}
          value={
            updatedParameters?.[key] ||
            (parameters?.[key] as ParameterValue) ||
            parametersDefinition[key].defaultValue
          }
          description={t(parametersDefinition[key].description)}
          inputCss="max-w-20 pl-2"
          onChange={handleParameterChange}
        />
      ))}
    </form>
  );
}
