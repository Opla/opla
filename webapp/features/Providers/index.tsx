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

import { useEffect, useRef } from 'react';
import MainView from '@/components/common/MainView';
import { useModelsStore, useProviderStore } from '@/stores';
import { StorageState } from '@/stores/types';
import Explorer from './Explorer';
import ProviderView from './Provider';




export default function Providers({ selectedProviderId }: { selectedProviderId?: string }) {
  const { state, loadProviders } = useProviderStore();
  const { loadModels } = useModelsStore();
  const init = useRef<boolean>(true);
  useEffect(() => {
    if (init.current && state === StorageState.INIT) {
      init.current = false;
      loadProviders();
      loadModels();
    }
  }, [state, loadModels, loadProviders]);
  return (
    <MainView selectedId={selectedProviderId} explorer={Explorer} contentView={ProviderView} />
  );
}
