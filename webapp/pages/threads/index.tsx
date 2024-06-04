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

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useBackend from '@/hooks/useBackendContext';
import MainThreads from '@/features/Threads';
import { Page } from '@/types/ui';

export default function DefaultThreads() {
  const router = useRouter();
  const { config } = useBackend();
  useEffect(() => {
    const { settings } = config;
    if (settings.pages?.[Page.Threads]?.selectedId) {
      router.replace(`${Page.Threads}/${settings.pages?.[Page.Threads].selectedId}`);
    }
  }, [router, config]);
  return <MainThreads />;
}
