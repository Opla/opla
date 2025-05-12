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

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: LucideIcon;
  endIcon?: LucideIcon;
  classNameInput?: string;
}

const InputIcon = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, classNameInput, type, startIcon, endIcon, ...props }, ref) => {
    const StartIcon = startIcon;
    const EndIcon = endIcon;

    return (
      <div
        className={cn(
          'disabled-within:opacity-50 border-input focus-within:ring-ring flex w-full items-center rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-within:ring-1 focus-within:outline-hidden',
          className,
        )}
      >
        {StartIcon && <StartIcon className="text-muted-foreground h-4 w-4" strokeWidth={1.5} />}
        <input
          type={type}
          className={cn(
            'focus-visible:ring-none placeholder:text-muted-foreground focus-visible:caret-primary flex h-9 w-full bg-transparent file:border-0 file:text-sm file:font-medium focus-visible:outline-hidden disabled:cursor-not-allowed',
            startIcon ? 'pl-4' : '',
            endIcon ? 'pr-4' : '',
            classNameInput,
          )}
          ref={ref}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...props}
        />
        {EndIcon && <EndIcon className="text-muted-foreground h-4 w-4" strokeWidth={1.5} />}
      </div>
    );
  },
);
InputIcon.displayName = 'Input';

export { InputIcon };
