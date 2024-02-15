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

import { ParameterValue, ParametersRecord } from '@/components/common/Parameter';
import logger from '@/utils/logger';
import { useState } from 'react';
import useDebounceFunc from './useDebounceFunc';

export type ParametersCallback = (params: ParametersRecord) => ParametersRecord | undefined;

function useParameters(
  onParametersChanged: ParametersCallback,
  debounceDelay = 600,
): [ParametersRecord | undefined, (name: string, value?: ParameterValue) => void] {
  const [updatedParameters, setUpdatedParameters] = useState<ParametersRecord | undefined>(
    undefined,
  );

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

  return [updatedParameters, handleParameterChange];
}

export default useParameters;
