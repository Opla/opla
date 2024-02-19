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
import { BaseNamedRecord } from '@/types';
import { HelpCircle } from 'lucide-react';

export type ParameterValue = string | number | boolean | BaseNamedRecord[];
export type ParametersRecord = Record<string, ParameterValue | undefined>;

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
  value?: ParameterValue;
  type?: 'text' | 'password' | 'large-text' | 'number' | 'url' | 'select' | 'boolean' | 'array';
  disabled?: boolean;
  children?: React.ReactNode;
  onChange?: (name: string, value: ParameterValue) => void;
}) {
  const textCss = 'pr-2 w-sm';
  const boxCss =
    type === 'large-text'
      ? 'flex w-full flex-col px-4 pb-4 pt-3'
      : 'flex w-full flex-row px-4 pb-4 pt-3';

  let component = null;

  let flex = 'flex-row items-center justify-between';
  if (type === 'array') {
    component = (
      <div className="flex flex-col gap-2">
        <div className={cn('flex flex-row', inputCss)}>
          <Input
            value={(value as BaseNamedRecord[])?.map((v) => v.name).join(',')}
            className="w-full"
            type={type}
            disabled={disabled}
            onChange={(e) => {
              // e.preventDefault();
              // const v = type === 'number' ? parseInt(e.target.value, 10) : e.target.value;
              const v = e.target.value as string;
              onChange(name, v.split(',').map((r) => ({ id: name, name: r })) as BaseNamedRecord[]);
            }}
          />
        </div>
      </div>
    );
  } else if (type === 'large-text') {
    flex = 'flex-col text-left';
    component = (
      <Textarea
        disabled={disabled}
        className="mt-2 w-full"
        value={value as string}
        onChange={(e) => {
          e.preventDefault();
          onChange(name, e.target.value);
        }}
      />
    );
  } else {
    component = (
      <div className={cn('flex flex-row', inputCss)}>
        {disabled && type === 'url' && (
          <a href={value as string} target="_blank" className={textCss}>
            {value as string}
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
    );
  }

  return (
    <div className={boxCss}>
      <div className="flex w-full flex-grow flex-col justify-center">
        <div className="flex w-full flex-row items-center justify-between">
          <div className={`flex grow flex-row ${flex}`}>
            <p>{title} </p>
            {component}
          </div>
          {description && (
            <Tooltip>
              <TooltipTrigger className="">
                <HelpCircle className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="w-[265px] text-sm">{description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-sm">{subtitle}</p>
      </div>
    </div>
  );
}
