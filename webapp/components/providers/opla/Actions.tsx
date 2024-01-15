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

import { Pause, Play, AlertTriangle, Loader2 } from 'lucide-react';
import { OplaContext, Provider } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function Actions({
  provider,
  backend,
  onProviderToggle,
}: {
  provider: Provider;
  backend: OplaContext;
  onProviderToggle: () => void;
}) {
  const { message, status } = backend.server;
  const { t } = useTranslation();
  const waiting = status === 'wait' || status === 'stopping' || status === 'starting';
  const disabled = (status === 'error' && message === 'no backend') || waiting;
  let tooltipMessage;
  switch (status) {
    case 'wait':
      tooltipMessage = t('wait');
      break;
    case 'starting':
      tooltipMessage = t('starting');
      break;
    case 'started':
      tooltipMessage = t('started');
      break;
    case 'stopping':
      tooltipMessage = t('stopping');
      break;
    case 'stopped':
      tooltipMessage = t('stopped');
      break;
    case 'error':
      tooltipMessage = `${provider.name}: ${t(backend.server.message as string)}`;
      break;
    default:
      tooltipMessage = t('wait');
      break;
  }

  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            onClick={(event) => {
              event.preventDefault();
              onProviderToggle();
            }}
          >
            {waiting && <Loader2 strokeWidth={1.5} className="loading-icon h-4 w-4 animate-spin" />}
            {!waiting && status === 'started' && <Pause strokeWidth={1.5} className="h-4 w-4" />}
            {!waiting && status !== 'started' && <Play strokeWidth={1.5} className="h-4 w-4" />}
            {status === 'error' && (
              <span className="absolute right-0 top-0 inline-flex translate-x-1 translate-y-5 transform rounded-full bg-red-600 p-[2px]">
                <AlertTriangle
                  strokeWidth={1.5}
                  className="h-[13px] w-[13px] -translate-y-[1px] text-white"
                />
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipMessage}</TooltipContent>
      </Tooltip>
    </div>
  );
}
