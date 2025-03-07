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

import { cn } from '@/lib/utils';
import { BasicState } from '@/types/ui';
import { getStateColor } from '@/utils/ui';

type PastilleProps = {
  state?: BasicState;
  className?: string;
  defaultEnabled?: boolean;
};

function Pastille({ state, defaultEnabled = false, className }: PastilleProps) {
  const color = getStateColor(state, 'bg', defaultEnabled);
  return <span className={cn('h-2 w-2 shrink-0 rounded-full', color, className)} />;
}

export default Pastille;
