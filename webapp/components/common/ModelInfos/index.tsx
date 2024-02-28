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

import { BluePill, GreenPill, PurplePill, RedPill, YellowPill } from '@/components/ui/Pills';
import useTranslation from '@/hooks/useTranslation';
import { Model, ModelState } from '@/types';

type ModelInfosProps = {
  model: Model;
  displayName?: boolean;
  stateAsIcon?: boolean;
};

function ModelInfos({ model, displayName = true, stateAsIcon = false }: ModelInfosProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center space-x-2">
      {displayName && (
        <span className="grow rounded px-2.5 py-0.5 font-extrabold">
          {model.title || model.name}
        </span>
      )}
      <div className="flex items-center justify-between space-x-2">
        {model.quantization && <BluePill label={model.quantization} />}
        {model.bits && <YellowPill label={`${model.bits}B`} />}
        {model.size && <PurplePill label={`${String(Math.round(model.size * 10) / 10)}Gb`} />}
        {!stateAsIcon && model.state === ModelState.Downloading && (
          <GreenPill label={t('Downloading')} />
        )}
        {!stateAsIcon && model.state === ModelState.Error && <RedPill label={t('Error')} />}
      </div>
    </div>
  );
}

export default ModelInfos;
