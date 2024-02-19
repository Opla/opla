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
import { v4 as uuid } from 'uuid';
import { BaseIdRecord, BaseNamedRecord, Entity, Resource, Content } from '@/types';

const createBaseRecord = () => {
  const item: BaseIdRecord = {
    id: uuid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return item;
};

const updateRecord = (item: BaseIdRecord) => ({
  ...item,
  updatedAt: Date.now(),
});

const createBaseNamedRecord = (name: string, description?: string) => {
  const item: BaseNamedRecord = {
    ...createBaseRecord(),
    name,
  };
  if (description) {
    item.description = description;
  }
  return item;
};

const deepCopy = <T>(obj: T): T =>
  window?.structuredClone
    ? (window.structuredClone(obj) as T)
    : (JSON.parse(JSON.stringify(obj)) as T);

const deepMerge = <T>(_target: T, source: Partial<T>, copy = false): T => {
  const target = (copy ? deepCopy<T>(_target) : _target) as Record<string, unknown>;
  const obj = source as Record<string, unknown>;
  Object.keys(obj).forEach((key: string) => {
    const value = obj[key];
    if (value !== null && typeof value === 'object') {
      if (typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  });
  return target as T;
};

const deepSet = <V, T>(obj: V, path: string, _value: T, root = path): Record<string, T> => {
  const [property, ...properties] = path.split('.');
  let value = _value;
  if (typeof obj === 'object' && properties.length) {
    value = deepSet(
      (obj as Record<string, T>)[property] || {},
      properties.join('.'),
      _value,
      root,
    ) as T;
  }
  if (typeof obj !== 'object') {
    throw new Error(`Path '${root}' is not accessible`);
  }
  return { ...obj, [property]: value };
};

const deepGet = <T, V>(obj: T, path: string, defaultValue?: V, root = path): V => {
  const [property, ...properties] = path.split('.');
  if (obj === undefined || obj === null) {
    return defaultValue as V;
  }
  const prop = (obj as Record<string, V>)[property];
  if (properties.length) {
    return deepGet(prop as Record<string, V>, properties.join('.'), defaultValue, root);
  }
  if (typeof obj !== 'object' || property in obj === false) {
    return defaultValue as V;
  }
  return prop;
};

export const deepEqual = <T>(a: T, b: T): boolean => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (
    Array.isArray(a) === Array.isArray(b) &&
    (a as unknown[]).length === (b as unknown[]).length
  ) {
    return (a as unknown[]).every((v: unknown, i: number) => deepEqual(v, (b as unknown[])[i]));
  }
  if (Object.keys(a).length === Object.keys(b).length) {
    Object.keys(a).every((key: string) => {
      if (!(key in b)) return false;
      if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
        return false;
      return true;
    });
  }
  return false;
};

// Inspiration: https://github.com/rayepps/radash/blob/31c1397437d7fb7a78e97499c8d46f992c49844c/src/object.ts

export const mapKeys = <TValue>(
  value: TValue | any,
  mapFunc: (key: string, value: TValue) => string,
): TValue => {
  if (Array.isArray(value)) {
    return value.map((item) => mapKeys(item, mapFunc)) as TValue;
  }
  if (!value || typeof value !== 'object') return value as TValue;
  const record = value as Record<string, TValue>;
  const keys = Object.keys(record) as string[];
  return keys.reduce(
    (acc, key) => {
      let v = record[key];
      if (Array.isArray(value) || typeof v === 'object') {
        v = mapKeys(v, mapFunc);
      }
      acc[mapFunc(key, v)] = v;
      return acc;
    },
    {} as Record<string, TValue>,
  ) as TValue;
};

const getEntityName = (entity: string | Entity | undefined) =>
  ((entity as Entity)?.name || entity || '') as string;

const getResourceUrl = (resource: string | Resource | undefined) =>
  ((resource as Resource)?.url || resource || '') as string;

const getContent = (content: string | Content | undefined) =>
  ((content as Content)?.parts?.join('\n') || content || '') as string;

export {
  createBaseRecord,
  createBaseNamedRecord,
  updateRecord,
  deepCopy,
  deepGet,
  deepMerge,
  deepSet,
  getEntityName,
  getResourceUrl,
  getContent,
};
