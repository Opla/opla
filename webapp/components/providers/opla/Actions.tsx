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

import { PiPause, PiPlay, PiSpinner, PiWarning } from 'react-icons/pi';
import Tooltip, { Orientation } from '@/components/common/Tooltip';
import { BackendContext } from '@/types/backend';
import { Provider } from '@/types';
import useTranslation from '@/hooks/useTranslation';

export default function Actions({
  provider,
  backend,
  onProviderToggle,
}: {
  provider: Provider;
  backend: BackendContext;
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
      <Tooltip message={tooltipMessage} orientation={Orientation.Left}>
        <button
          type="button"
          disabled={disabled}
          className="relative inline-block flex flex-row rounded-md bg-neutral-500 bg-transparent p-1 text-neutral-400 hover:text-white disabled:bg-neutral-500 disabled:hover:text-neutral-400"
          onClick={(event) => {
            event.preventDefault();
            onProviderToggle();
          }}
        >
          {waiting && <PiSpinner className="loading-icon h-[24px] w-[24px]" />}
          {!waiting && status === 'started' && <PiPause className="h-[24px] w-[24px]" />}
          {!waiting && status !== 'started' && <PiPlay className="h-[24px] w-[24px]" />}
          {status === 'error' && (
            <span className="absolute right-0 top-0 inline-flex translate-x-1 translate-y-5 transform rounded-full bg-red-600 p-[2px]">
              <PiWarning className="h-[13px] w-[13px] -translate-y-[1px] text-white" />
            </span>
          )}
        </button>
      </Tooltip>
    </div>
  );
}
