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
import { Provider } from '@/types';
import { Plug } from 'lucide-react';
import { getProviderState } from '@/utils/data/providers';
import { getStateColor } from '@/utils/ui';
import { Button } from '../../ui/button';

export default function Toolbar({
  provider,
  onProviderToggle,
  onParametersSave,
  hasParametersChanged,
  actions,
}: {
  provider: Provider;
  onProviderToggle: () => void;
  onParametersSave: () => void;
  hasParametersChanged: boolean;
  actions?: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center text-xs">
      <div className="flex w-full flex-row items-center justify-between gap-1 bg-neutral-50 p-3 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
        <div className="mx-3 flex h-7 flex-row items-center  px-2">
          {provider?.type.toLowerCase() !== provider?.name.toLowerCase() && (
            <span className="gap-1 py-1 capitalize text-neutral-700 dark:text-neutral-500">
              {provider?.type}
            </span>
          )}
          <span className="items-center truncate truncate px-3 dark:text-neutral-300">
            {provider?.name}
          </span>
        </div>
        <div className="flex flex-grow flex-row-reverse items-center gap-4">
          {actions || (
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                onProviderToggle();
              }}
            >
              <span className={getStateColor(getProviderState(provider), 'text')}>
                <Plug className="mr-2 h-4 w-4 rotate-90" />
              </span>
              <span>{provider?.disabled ? t('Enable') : t('Disable')}</span>
            </Button>
          )}
          <Button
            disabled={!hasParametersChanged}
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onParametersSave();
            }}
          >
            {t('Save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
