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

import { Button } from '@/components/ui/button';
import { Ui } from '@/types';
import { BasicState } from '@/types/ui';
import { getStateColor } from '@/utils/ui';
import { cn } from '@/lib/utils';
import { Badge } from '../../../components/ui/badge';
import Pastille from '../../../components/common/Pastille';

type ServiceBadgeProps = {
  state?: Ui.BasicState;
  providerName?: string;
  disabled?: boolean;
  onEnableProvider?: () => void;
};

export default function ServiceBadge({
  state,
  providerName,
  disabled,
  onEnableProvider,
}: ServiceBadgeProps) {
  return (
    <Button asChild onClick={onEnableProvider}>
      <Badge
        className={cn(
          'h-[12px] rounded-sm bg-gray-300 text-xs text-gray-600 capitalize hover:bg-gray-400',
          disabled || !state || state === (BasicState.disabled || BasicState.error)
            ? 'cursor-pointer'
            : '',
        )}
      >
        <span className={`mr-2 ${getStateColor(state, 'text', true)}`}>
          {providerName && providerName !== 'Opla' ? providerName : 'local'}
        </span>
        <Pastille state={state} />
      </Badge>
    </Button>
  );
}
