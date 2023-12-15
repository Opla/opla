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

import { createContext, useState } from 'react';
import { Conversation, Model, Preset, Provider } from '@/types';
import useDataStorage from '@/hooks/useDataStorage';

export enum BackendStatus {
  INIT = 'init',
  WAIT = 'wait',
  STARTING = 'starting',
  STARTED = 'started',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export type BackendPayload = {
  status: BackendStatus;
  message?: string;
};

export type BackendContext = {
  server: {
    status: BackendStatus;
    message?: string;
    name?: string;
    stout: string[];
    sterr: string[];
    actions: {
      start: () => void;
      stop: () => void;
      restart: () => void;
    };
  };
};

export type Context = {
  conversations: Array<Conversation>;
  providers: Array<Provider>;
  models: Array<Model>;
  presets: Array<Preset>;
  setConversations: (newConversations: Conversation[]) => void;
  setProviders: (newProviders: Provider[]) => void;
  setModels: (newModels: Model[]) => void;
  setPresets: (newPresets: Preset[]) => void;
  backend: BackendContext;
  setBackend: (newBackend: BackendContext) => void;
};

const initialBackendContext: BackendContext = {
  server: {
    status: BackendStatus.INIT,
    stout: [],
    sterr: [],
    actions: {
      start: () => {
        throw new Error('Start server not implemented');
      },
      stop: () => {
        throw new Error('Stop server not implemented');
      },
      restart: () => {
        throw new Error('Restart server not implemented');
      },
    },
  },
};

const initialContext: Context = {
  conversations: [],
  setConversations: () => {},
  providers: [],
  setProviders: () => {},
  models: [],
  setModels: () => {},
  presets: [],
  setPresets: () => {},
  backend: initialBackendContext,
  setBackend: () => {},
};

const AppContext = createContext(initialContext);

function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useDataStorage(
    'conversations',
    initialContext.conversations,
  );

  const [providers, setProviders] = useDataStorage('providers', initialContext.providers);
  const [models, setModels] = useDataStorage('models', initialContext.models);
  const [presets, setPresets] = useDataStorage('presets', initialContext.presets);

  const [backend, setBackend] = useState(initialBackendContext);

  return (
    <AppContext.Provider
      // eslint-disable-next-line react/jsx-no-constructed-context-values
      value={{
        conversations,
        setConversations,
        providers,
        setProviders,
        models,
        setModels,
        presets,
        setPresets,
        backend,
        setBackend,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export { AppContext, AppContextProvider };
