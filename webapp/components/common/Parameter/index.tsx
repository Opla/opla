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

import { ChangeEvent, HTMLInputTypeAttribute, useRef } from 'react';
import { File, Folder, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BaseNamedRecord, ParameterDefinitionType } from '@/types';
import { Button } from '@/components/ui/button';
import { t } from 'i18next';
import { showInFolder } from '@/utils/backend/commands';

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;
    webkitdirectory?: string;
  }
}

export type ParameterValue = string | number | boolean | string[] | BaseNamedRecord[] | undefined;
export type ParametersRecord = Record<string, ParameterValue>;

const getAttribute = (type: ParameterDefinitionType): HTMLInputTypeAttribute | undefined => {
  if (type === 'path') {
    return 'file';
  }
  return type;
};
type ParameterProps = {
  label?: string;
  sublabel?: string;
  placeholder?: string;
  name: string;
  description?: string;
  inputCss?: string;
  min?: number;
  max?: number;
  value?: ParameterValue;
  type?: ParameterDefinitionType;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  onChange?: (name: string, value: ParameterValue | undefined) => void;
  onAction?: () => void;
};

export default function Parameter({
  label,
  placeholder,
  name,
  sublabel = '',
  description,
  inputCss,
  value,
  min,
  max,
  type = 'text',
  disabled = false,
  className,
  children,
  onChange = () => {},
  onAction,
}: ParameterProps) {
  const hiddenFileInput = useRef<HTMLInputElement>(null);
  const textCss = 'pr-2 w-sm';
  const boxCss =
    type === 'large-text' ? 'flex w-full flex-col px-0 py-2' : 'flex w-full flex-row px-0 py-2';

  let component = null;

  const handleClick = () => {
    hiddenFileInput.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, n: string) => {
    const fileUploaded = event.target.files?.[0];
    onChange(n, fileUploaded?.name);
  };

  const handleShowfile = () => {
    showInFolder(value as string);
  };

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
              const v = e.target.value;
              const vv = v
                .split(',')
                .map((r, i) => ({ id: `name-${i}`, name: r })) as BaseNamedRecord[];
              onChange(name, vv);
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
        className="mt-2 w-full resize-none overflow-y-hidden"
        value={(value as string) || ''}
        placeholder={placeholder}
        onChange={(e) => {
          e.preventDefault();
          onChange(name, e.target.value);
        }}
      />
    );
  } else if (!(children && type === 'text')) {
    component = (
      <div className={cn('flex flex-row', inputCss)}>
        {disabled && type === 'url' && (
          <a href={value as string} target="_blank" className={textCss}>
            {value as string}
          </a>
        )}
        {disabled && type === 'text' && (
          <p
            className={cn(
              textCss,
              'text-muted-foreground w-full min-w-[220px] px-3 py-1 text-left',
            )}
          >
            {value as string}
          </p>
        )}
        {disabled && !onAction && (type === 'file' || type === 'path') && (
          <div className="flex items-center gap-4">
            <Button variant="link" className="text-muted-foreground" onClick={handleShowfile}>
              {(value as string) || t('None')}
            </Button>
            {type === 'path' ? (
              <Folder strokeWidth={1.5} className="text-muted m-2.5 h-4 w-4" />
            ) : (
              <File strokeWidth={1.5} className="text-muted h-4 w-4" />
            )}
          </div>
        )}
        {type === 'boolean' && (
          <Switch
            checked={value as boolean}
            onCheckedChange={(checked: boolean) => {
              onChange(name, checked);
            }}
          />
        )}
        {((type === 'text' && !disabled) ||
          type === 'number' ||
          type === 'password' ||
          (type === 'url' && !disabled)) && (
          <Input
            value={value === undefined || Array.isArray(value) ? '' : (value as string)}
            placeholder={placeholder}
            className="w-full min-w-[60px]"
            type={getAttribute(type)}
            disabled={disabled}
            min={min}
            max={max}
            step="any"
            onChange={(e) => {
              // e.preventDefault();
              let v;
              if (e.target.value === '') {
                v = undefined;
              } else {
                v = type === 'number' ? parseInt(e.target.value, 10) : e.target.value;
              }
              onChange(name, v);
            }}
          />
        )}
        {(type === 'path' || type === 'file') && (onAction || !disabled) && (
          <div className="flex items-center gap-4">
            <Button variant="link" className="text-muted-foreground" onClick={handleShowfile}>
              {(value as string) || t('None')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                if (onAction) {
                  onAction();
                } else {
                  handleClick();
                }
              }}
            >
              {type === 'path' ? (
                <Folder strokeWidth={1.5} className="h-4 w-4" />
              ) : (
                <File strokeWidth={1.5} className="h-4 w-4" />
              )}
            </Button>
            {!disabled && type === 'file' && (
              <Input
                value=""
                placeholder={placeholder}
                className="hidden"
                type={getAttribute(type)}
                ref={hiddenFileInput}
                onChange={(e) => {
                  handleFileChange(e, name);
                }}
              />
            )}
          </div>
        )}
        {children}
      </div>
    );
  } else {
    component = children;
  }

  return (
    <div className={cn(boxCss, className)}>
      <div className="flex w-full grow flex-col justify-center">
        <div className="flex w-full flex-row items-center justify-between">
          <div className={`flex grow flex-row ${flex}`}>
            {label && (
              <Label className="flex flex-1 flex-col justify-center">
                <p className="capitalize">{label}</p>
                <p className="text-muted-foreground pt-2 text-sm">{sublabel}</p>
              </Label>
            )}
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
      </div>
    </div>
  );
}
