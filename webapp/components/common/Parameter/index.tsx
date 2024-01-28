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

'use client';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';

export default function Parameter({
  title,
  name,
  subtitle = '',
  description,
  inputCss,
  value,
  min,
  max,
  type = 'text',
  disabled = false,
  children,
  onChange = () => {},
}: {
  title: string;
  name: string;
  subtitle?: string;
  description?: string;
  inputCss?: string;
  min?: number;
  max?: number;
  value?: string | number | boolean;
  type?: 'text' | 'password' | 'large-text' | 'number' | 'url' | 'select' | 'boolean' | 'switch';
  disabled?: boolean;
  children?: React.ReactNode;
  onChange?: (name: string, value: string | number | boolean) => void;
}) {
  const textCss = 'pr-2 w-sm';
  const boxCss =
    type === 'large-text'
      ? 'flex w-full flex-col px-4 pb-4 pt-3'
      : 'flex w-full flex-row px-4 pb-4 pt-3';

  return (
    <div className={boxCss}>
      <div className="flex flex-grow flex-col justify-center">
        <p className="w-full">
          {description && (
            <Tooltip>
              <TooltipTrigger className="flex w-full flex-row items-center justify-between">
                <span>{title} </span>
                <HelpCircle className="ml-2 h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="w-[265px] text-sm">{description}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {!description && <span>{title}</span>}
        </p>
        <p className="text-sm">{subtitle}</p>
      </div>
      {type !== 'large-text' && (
        <div className={cn('flex flex-row', inputCss)}>
          {disabled && type === 'url' && (
            <a href={value as string} target="_blank" className={textCss}>
              {value}
            </a>
          )}
          {type === 'boolean' && (
            <Switch
              checked={value as boolean}
              onCheckedChange={(checked: boolean) => {
                onChange(name, checked);
              }}
            />
          )}
          {(type === 'text' || type === 'number' || type === 'url') && (
            <Input
              value={value as string}
              className="w-full"
              type={type}
              disabled={disabled}
              min={min}
              max={max}
              step="any"
              onChange={(e) => {
                // e.preventDefault();
                // const v = type === 'number' ? parseInt(e.target.value, 10) : e.target.value;
                const v = e.target.value;
                onChange(name, v);
              }}
            />
          )}
          {children}
        </div>
      )}
      {type === 'large-text' && (
        <Textarea
          disabled={disabled}
          className="mt-2 w-full"
          value={value as string}
          onChange={(e) => {
            e.preventDefault();
            onChange(name, e.target.value);
          }}
        />
      )}
    </div>
  );
}
