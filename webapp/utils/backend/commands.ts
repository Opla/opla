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

// import { invoke } from '@tauri-apps/api';
import {
  Model,
  ModelsCollection,
  OplaServer,
  Payload,
  Provider,
  Settings,
  Store,
  Sys,
} from '@/types';
import { toast } from '@/components/ui/Toast';
import { mapKeys } from '../data';
import { toCamelCase, toSnakeCase } from '../string';
import logger from '../logger';
import { invokeTauri } from './tauri';

export const getSys = async (): Promise<Sys> => {
  const sys = await invokeTauri<Sys>('get_sys');
  return mapKeys(sys, toCamelCase);
};

export const getOplaServerStatus = async (): Promise<Payload> => {
  const payload = await invokeTauri<Payload>('get_opla_server_status');
  return mapKeys(payload, toCamelCase);
};

export const getOplaServer = async (): Promise<OplaServer> => {
  const server = await invokeTauri<OplaServer>('get_opla_server');
  return mapKeys(server, toCamelCase);
};

export const getOplaConfig = async (): Promise<Store> => {
  const store = await invokeTauri<Store>('get_opla_configuration');
  return mapKeys(store, toCamelCase);
};

export const setActiveModel = async (modelId: String, provider?: String) => {
  await invokeTauri('set_active_model', { modelId, provider });
};

export const saveSettings = async (settings: Settings): Promise<Store> => {
  const args = mapKeys({ settings }, toSnakeCase);
  const store = await invokeTauri<Store>('save_settings', args);
  return mapKeys(store, toCamelCase);
};

export const getProviderTemplate = async (): Promise<Provider> => {
  const template = await invokeTauri<Provider>('get_provider_template');
  return mapKeys(template, toCamelCase);
};

export const getModelsCollection = async (): Promise<{ models: [] }> => {
  try {
    const collection = await invokeTauri<ModelsCollection>('get_models_collection');
    logger.info('getModelsCollection', collection);
    return await mapKeys(collection, toCamelCase);
  } catch (error) {
    logger.error(error);
    toast.error(`Error fetching models ${error}`);
  }
  return { models: [] };
};

export const installModel = async (
  model: Model,
  url: string | undefined,
  path: string,
  fileName: string,
): Promise<string> => {
  try {
    const id = await invokeTauri<string>('install_model', { model, url, path, fileName });
    return id;
  } catch (error) {
    logger.error(error);
    toast.error(`Error installing model ${error}`);
  }
  return '';
};

export const getModelFullPath = async (filename: string) =>
  invokeTauri<string>('get_model_full_path', { filename });

export const cancelDownloadModel = async (modelId: string) => {
  await invokeTauri<string>('cancel_download_model', { modelId });
};

export const uninstallModel = async (modelId: string) => {
  await invokeTauri<string>('uninstall_model', { modelId });
};

export const updateModel = async (model: Model) => {
  try {
    const args = mapKeys({ model }, toSnakeCase);
    await invokeTauri<void>('update_model', args);
  } catch (error) {
    logger.error(error);
    toast.error(`Error updating model ${error}`);
  }
};

export const updateModelEntity = async (model: Model) => {
  try {
    const args = mapKeys({ model, entity: model }, toSnakeCase);
    await invokeTauri<void>('update_model_entity', args);
  } catch (error) {
    logger.error(error);
    toast.error(`Error updating model ${error}`);
  }
};

export const getAssistantsCollection = async (): Promise<{ assistants: []; tags: [] }> => {
  try {
    const collection = await invokeTauri<ModelsCollection>('get_assistants_collection');
    logger.info('getAssistantsCollection', collection);
    return await mapKeys(collection, toCamelCase);
  } catch (error) {
    logger.error(error);
    toast.error(`Error fetching assistants ${error}`);
  }
  return { assistants: [], tags: [] };
};
