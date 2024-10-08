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

import { ParameterDefinitions } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import useParameters, { ParametersCallback } from '@/hooks/useParameters';
import Parameter, { ParameterValue } from '../Parameter';

export type FormProps<T> = {
  id: string | undefined;
  parameters: Record<string, T> | undefined;
  parametersDefinition: ParameterDefinitions;
  debounceDelay?: number;
  onParametersChange: ParametersCallback;
};

export default function Form<T>({
  id,
  parameters,
  parametersDefinition,
  onParametersChange,
  debounceDelay,
}: FormProps<T>) {
  const { t } = useTranslation();
  const [updatedParameters, setUpdatedParameters] = useParameters(
    id,
    onParametersChange,
    debounceDelay,
  );

  return (
    <form className="p-2">
      {Object.keys(parametersDefinition).map((key) => (
        <Parameter
          key={key}
          label={t(parametersDefinition[key].name)}
          type={parametersDefinition[key].type}
          name={key}
          value={
            updatedParameters?.[key] ||
            (parameters?.[key] as ParameterValue) ||
            parametersDefinition[key].defaultValue
          }
          description={parametersDefinition[key].description}
          inputCss="max-w-20 pl-2"
          onChange={setUpdatedParameters}
        />
      ))}
    </form>
  );
}
