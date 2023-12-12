// Copyright 2023 mik
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

export default function Parameter({
  title,
  name,
  subtitle = '',
  value,
  type,
  disabled = false,
  children,
  onChange = () => {},
}: {
  title: string;
  name: string;
  subtitle?: string;
  value?: string | number | boolean;
  type: 'text' | 'password' | 'large-text' | 'number' | 'select' | 'switch';
  disabled?: boolean;
  children?: React.ReactNode;
  onChange?: (name: string, value: string | number | boolean) => void;
}) {
  const textCss = disabled
    ? 'w-full'
    : 'w-full bg-neutral-100 p-2 dark:bg-neutral-800 rounded-md border border-neutral-300 dark:border-neutral-600';

  return (
    <div className="bb-1 flex w-full flex-row border-b border-neutral-100 pb-4 pt-3 dark:border-neutral-800">
      <div className="flex flex-1 flex-col justify-center">
        <p className=" ">{title}</p>
        <p className="text-sm text-neutral-400">{subtitle}</p>
      </div>
      <div className="flex flex-grow flex-row">
        {disabled && <div className={textCss}>{value}</div>}
        {!disabled && (type === 'text' || type === 'number') && (
          <input
            value={value as string}
            className={textCss}
            type={type}
            onChange={(e) => {
              // e.preventDefault();
              const v = type === 'number' ? parseInt(e.target.value, 10) : e.target.value;
              onChange(name, v);
            }}
          />
        )}
        {!disabled && type === 'large-text' && (
          <textarea
            className={textCss}
            value={value as string}
            onChange={(e) => {
              e.preventDefault();
              onChange(name, e.target.value);
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
