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

import { invoke } from '@tauri-apps/api';
import { Model, Payload, Store } from '@/types';
import { mapKeys } from '../data';
import { toCamelCase } from '../string';

export const getOplaServerStatus = async (): Promise<Payload> => {
  const payload = (await invoke('get_opla_server_status')) as Payload;
  return mapKeys(payload, toCamelCase);
};

export const getOplaConfig = async (): Promise<Store> => {
  const store = (await invoke('get_opla_config')) as Store;
  return mapKeys(store, toCamelCase);
};

export const getModelsCollection = async (): Promise<{ models: [] }> => {
  try {
    const collection = (await invoke('get_models_collection')) as unknown as { models: Model[] };
    console.log("getCollection", collection);
    return await mapKeys(collection, toCamelCase);
  } catch (error) {
    console.error(error);
  }
  return { models: [] };
}