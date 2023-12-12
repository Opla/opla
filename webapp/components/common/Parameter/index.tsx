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
  type: 'text' | 'password' | 'large-text' | 'select' | 'switch';
  disabled?: boolean;
  children?: React.ReactNode;
  onChange?: (name: string, value: string | boolean) => void;
}) {
  const textCss = disabled
    ? 'w-full'
    : 'w-full bg-gray-100 p-2 dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600';

  return (
    <div className="bb-1 flex w-full flex-row border-b border-gray-100 pb-4 pt-3 dark:border-gray-800">
      <div className="flex flex-1 flex-col justify-center">
        <p className=" ">{title}</p>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
      <div className="flex flex-grow flex-row">
        {disabled && <div className={textCss}>{value}</div>}
        {!disabled && type === 'text' && (
          <input
            value={value as string}
            className={textCss}
            onChange={(e) => {
              // e.preventDefault();
              onChange(name, e.target.value);
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
