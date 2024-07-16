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

import { OplaContext, ServerStatus } from '@/types';
import logger from '../logger';

const context: OplaContext = {
  config: {
    server: {
      name: 'None',
      parameters: {},
    },
    models: {
      items: [],
    },
    // services: {},
  },
  server: {
    status: ServerStatus.ERROR,
    message: 'no backend',
  },
};

const createBackend = async () => {
  if (window?.__TAURI__) {
    const { default: Backend } = await import('@/utils/backend/Backend');
    return Backend.getInstance();
  }
  return {
    context,
    connect: async () => {
      logger.error('no backend');
      return context;
    },
    start: async () => {
      logger.error('no backend');
    },
    stop: async () => {
      logger.error('no backend');
    },
    restart: async () => {
      logger.error('no backend');
    },
  };
};

export default createBackend;
