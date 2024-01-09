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

import { Backend } from '@/utils/backend/connect';
import { ServerStatus } from '@/types';

const connect = async (listener: (payload: unknown) => void, downloadListener: (payload: unknown) => void) => {
  if (window?.__TAURI__) {
    const { default: connectBackend } = await import('@/utils/backend/connect');
    return connectBackend(listener, downloadListener);
  }
  return {
    context: {
      config: {
        settings: {
          startApp: false,
          welcomeSplash: false,
        },
        server: {
          name: 'None',
          parameters: {},
        },
        models: {
          defaultModel: 'None',
          items: [],
        },
      },
      server: {
        status: ServerStatus.ERROR,
        message: 'no backend',
      },
    },
    start: async () => { },
    stop: async () => { },
    restart: async () => { },
  } as Backend;
};

export default connect;
