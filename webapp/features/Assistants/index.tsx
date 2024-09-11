// Copyright 2024 Mik Bry
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

import { useEffect, useRef } from 'react';
import MainView from '@/components/common/MainView';
import { StorageState } from '@/stores/types';
import { useAssistantStore, useModelsStore, useProviderStore, useServerStore } from '@/stores';
import Explorer from './Explorer';
import Assistant from './Assistant';

export type AssistantProps = {
  selectedAssistantId?: string;
};

export default function Assistants({ selectedAssistantId }: AssistantProps) {
  const { state, loadAssistants } = useAssistantStore();
  const { loadProviders } = useProviderStore();
  const { loadModels } = useModelsStore();
  const { loadServerConfig } = useServerStore();
  const init = useRef<boolean>(true);
  useEffect(() => {
    if (init.current && state === StorageState.INIT) {
      init.current = false;
      loadServerConfig();
      loadAssistants();
      loadProviders();
      loadModels();
    }
  }, [state, loadAssistants, loadModels, loadProviders, loadServerConfig]);

  return <MainView selectedId={selectedAssistantId} explorer={Explorer} contentView={Assistant} />;
}
