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
  Asset,
  Message,
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
import { GGUF } from '@/types/gguf';
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

export const setActiveModel = async (modelId: string, provider?: string) => {
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
    toast.error(`Error fetching models: ${error}`);
  }
  return { models: [] };
};

export const installModel = async (
  _model: Model,
  url: string | undefined,
  path: string,
  fileName: string,
): Promise<string> => {
  try {
    const model: { created_at: string; updated_at: string } = mapKeys(_model, toSnakeCase);
    model.created_at = new Date(_model.createdAt).toISOString();
    model.updated_at = new Date(_model.updatedAt).toISOString();
    const id = await invokeTauri<string>('install_model', { model, url, path, fileName });
    return id;
  } catch (error) {
    logger.error(error);
    toast.error(`Error installing model: ${error}`);
  }
  return '';
};

export const getModelFullPath = async (path: string, filename: string) =>
  invokeTauri<string>('get_model_full_path', { path, filename });

export const cancelDownloadModel = async (modelNameOrId: string) => {
  await invokeTauri<string>('cancel_download_model', { modelNameOrId });
};

export const uninstallModel = async (modelId: string, inUse: boolean) => {
  await invokeTauri<string>('uninstall_model', { modelId, inUse });
};

export const updateModel = async (_model: Model) => {
  try {
    const model: { created_at: string; updated_at: string } = mapKeys(_model, toSnakeCase);
    model.created_at = new Date(_model.createdAt).toISOString();
    model.updated_at = new Date(_model.updatedAt).toISOString();
    const args = { model };
    await invokeTauri<void>('update_model', args);
  } catch (error) {
    logger.error(error);
    toast.error(`Error updating model: ${error}`);
  }
};

export const updateModelEntity = async (_model: Model) => {
  try {
    const model: { created_at: string; updated_at: string } = mapKeys(_model, toSnakeCase);
    model.created_at = new Date(_model.createdAt).toISOString();
    model.updated_at = new Date(_model.updatedAt).toISOString();
    const args = { model, entity: model };
    await invokeTauri<void>('update_model_entity', args);
  } catch (error) {
    logger.error(error);
    toast.error(`Error updating model: ${error}`);
  }
};

export const getAssistantsCollection = async (): Promise<{ assistants: []; tags: [] }> => {
  try {
    const collection = await invokeTauri<ModelsCollection>('get_assistants_collection');
    logger.info('getAssistantsCollection', collection);
    return await mapKeys(collection, toCamelCase);
  } catch (error) {
    logger.error(error);
    toast.error(`Error fetching assistants: ${error}`);
  }
  return { assistants: [], tags: [] };
};

export const getConfigPath = async (): Promise<string | undefined> => {
  try {
    const configDir = await invokeTauri<string>('get_config_path');
    logger.info('getConfigPath:', configDir);
    return configDir;
  } catch (error) {
    logger.error(error);
    toast.error(`Error getting config path: ${error}`);
  }
  return undefined;
};

export const getModelsPath = async (): Promise<string | undefined> => {
  try {
    const path = await invokeTauri<string>('get_models_path');
    logger.info('getModelsPath:', path);
    return path;
  } catch (error) {
    logger.error(error);
    toast.error(`Error getting data path: ${error}`);
  }
  return undefined;
};

export const validateAssets = async (toValidate: Asset[]): Promise<Asset[] | undefined> => {
  try {
    const args = mapKeys({ assets: toValidate }, toSnakeCase);
    let assets = await invokeTauri<Asset[]>('validate_assets', args);
    assets = await mapKeys(assets, toCamelCase);
    logger.info('validateAssets:', assets);
    return assets;
  } catch (error) {
    logger.error(error);
    toast.error(`Error validating assets: ${error}`);
  }
  return undefined;
};

export const getFileAssetExtensions = async (): Promise<string[]> => {
  try {
    const extensions = await invokeTauri<string[]>('get_file_asset_extensions');
    logger.info('getFileAssetExtensions:', extensions);
    return extensions;
  } catch (error) {
    logger.error(error);
    toast.error(`Error getFileAssetExtensions: ${error}`);
  }
  return [];
};

export const getModelFileHeader = async (modelId: string): Promise<Partial<GGUF>> => {
  try {
    let gguf = await invokeTauri<Partial<GGUF>>('get_model_file', { modelId });
    gguf = await mapKeys(gguf, toCamelCase);
    logger.info('getModelFileHeader:', gguf);
    return gguf;
  } catch (error) {
    logger.error(error);
    toast.error(`Error getModelFileHeader: ${error}`);
  }
  return {};
};

export const loadConversationMessages = async (
  conversationId: string,
  cache = true,
): Promise<Message[]> => {
  let messages: Message[];
  try {
    messages = await invokeTauri<Message[]>('load_conversation_messages', {
      conversationId,
      cache,
    });
    messages = await mapKeys(messages, toCamelCase);
  } catch (error) {
    logger.error(error);
    toast.error(`Error loadConversationMessages: ${error}`);
    messages = [];
  }
  return messages;
};

export const saveConversationMessages = async (
  conversationId: string,
  conversationMessages: Message[],
): Promise<void> => {
  try {
    const messages = mapKeys(conversationMessages, toSnakeCase);
    await invokeTauri<void>('save_conversation_messages', { conversationId, messages });
  } catch (error) {
    logger.error(error);
    toast.error(`Error saveConversationMessages: ${error}`);
  }
};

export const removeConversationMessages = async (conversationId: string): Promise<void> => {
  try {
    await invokeTauri<void>('remove_conversation_messages', { conversationId });
  } catch (error) {
    logger.error(error);
    toast.error(`Error removeConversationMessages: ${error}`);
  }
};

export const showInFolder = async (path: string) => {
  try {
    await invokeTauri<void>('show_in_folder', { path });
  } catch (error) {
    logger.error(error);
    toast.error(`Error showInFolder: ${error}`);
  }
};
