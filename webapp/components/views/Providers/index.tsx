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

import MainView from '@/components/common/MainView';
import Explorer from './Explorer';
import ProviderView from './Provider';

export default function Providers({ selectedProviderId }: { selectedProviderId?: string }) {
  return (
    <MainView selectedId={selectedProviderId} explorer={Explorer} contentView={ProviderView} />
  );
}
