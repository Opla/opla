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
import { cn } from '@/lib/utils';
import { Model, ModelState } from '@/types';
import ModelIcon from '../ModelIcon';

type ModelInfosProps = {
  model: Model;
  displayName?: boolean;
  displayIcon?: boolean;
  stateAsIcon?: boolean;
  className?: string;
};

function ModelInfos({
  model,
  displayName = true,
  displayIcon = false,
  stateAsIcon = false,
  className,
}: ModelInfosProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex items-center space-x-2 font-extrabold', className)}>
      {displayIcon && (
        <ModelIcon
          icon={model.icon}
          name={model.name}
          className="h-4 w-4"
          providerName={model.creator}
        />
      )}
      {displayName && (
        <span className="grow rounded px-2.5 py-0.5">{model.title || model.name}</span>
      )}
      <div className="flex items-center justify-between space-x-2">
        {model.quantization && <BluePill label={model.quantization} />}
        {model.bits && <YellowPill label={`${model.bits}B`} />}
        {model.size && <PurplePill label={`${String(Math.round(model.size * 10) / 10)}Gb`} />}
        {!stateAsIcon && model.state === ModelState.Downloading && (
          <GreenPill label={t('Downloading')} />
        )}
        {!stateAsIcon && model.state === ModelState.Error && <RedPill label={t('Error')} />}
        {!stateAsIcon && model.state === ModelState.NotFound && <RedPill label={t('NotFound')} />}
        {!stateAsIcon && model.state === ModelState.Removed && <RedPill label={t('Removed')} />}
      </div>
    </div>
  );
}

export default ModelInfos;
