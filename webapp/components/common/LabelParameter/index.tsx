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

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type LabelParameterProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

function LabelParameter({ label, children, className }: LabelParameterProps) {
  return (
    <div className={cn('space-y-2 py-2', className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default LabelParameter;
