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

import { Button } from '@/components/ui/button';
import { Ui } from '@/types';
import { BasicState } from '@/types/ui';
import { getStateColor } from '@/utils/ui';
import { cn } from '@/lib/utils';
import { Badge } from '../../../ui/badge';
import Pastille from '../../../common/Pastille';

type ServiceBadgeProps = {
  state?: Ui.BasicState;
  providerName?: string;
  disabled?: boolean;
  handleEnableProvider: () => void;
};

export default function ServiceBadge({
  state,
  providerName,
  disabled,
  handleEnableProvider,
}: ServiceBadgeProps) {
  return (
    <Button asChild onClick={handleEnableProvider}>
      <Badge
        className={cn(
          'mr-4 h-[24px] bg-gray-300 capitalize text-gray-600 hover:bg-gray-400',
          disabled || !state || state === (BasicState.disabled || BasicState.error)
            ? 'cursor-pointer'
            : '',
        )}
      >
        <span className={`mr-2  ${getStateColor(state, 'text', true)}`}>
          {providerName || 'local'}
        </span>
        <Pastille state={state} />
      </Badge>
    </Button>
  );
}
