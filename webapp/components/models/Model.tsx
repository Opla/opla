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

import { useContext } from 'react';
import { AppContext } from '@/context';

function Model({ modelId }: { modelId?: string }) {
  const { providers } = useContext(AppContext);
  const initialModel = providers.find((m) => m.id === modelId);
  return (
    <div className="flex max-w-full flex-1 flex-col dark:bg-neutral-800/30">
      <div className="transition-width relative flex h-full w-full flex-1 flex-col items-stretch overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col items-center text-xs">
            <div className="justify-left flex w-full flex-row items-center gap-1 bg-neutral-50 p-3 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
              <div className="mx-3 flex h-7 flex-row items-center rounded-md border border-neutral-600 px-2">
                <span className="gap-1 py-1 capitalize text-neutral-700 dark:text-neutral-500">
                  {initialModel?.type}
                </span>
                <span className="items-center truncate truncate px-3 dark:text-neutral-300">
                  {initialModel?.name}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center text-sm dark:bg-neutral-900" />
        </div>
      </div>
    </div>
  );
}

export default Model;
