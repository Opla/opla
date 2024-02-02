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

// Inspiration: https://github.com/rayepps/radash/blob/31c1397437d7fb7a78e97499c8d46f992c49844c/src/string.ts#L20-L31

export const toCapitalize = (str: string): string => {
  if (!str || str.length === 0) return '';
  const lower = str.toLowerCase();
  return lower.substring(0, 1).toUpperCase() + lower.substring(1, lower.length);
};

export const toCamelCase = (str: string): string => {
  if (str.startsWith('/')) return str;
  const parts =
    str
      ?.replace(/([A-Z])+/g, toCapitalize)
      ?.split(/(?=[A-Z])|[.\-\s_]/)
      .map((x) => x.toLowerCase()) ?? [];
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts.reduce((acc, part) => `${acc}${part.charAt(0).toUpperCase()}${part.slice(1)}`);
};

export const toSnakeCase = (str: string): string => {
  if (str.startsWith('/')) return str;
  const parts =
    str
      ?.replace(/([A-Z])+/g, toCapitalize)
      .split(/(?=[A-Z])|[.\-\s_]/)
      .map((x) => x.toLowerCase()) ?? [];
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts.reduce((acc, part) => `${acc}_${part.toLowerCase()}`);
};
