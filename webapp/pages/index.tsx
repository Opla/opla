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

export default function Home() {
  const router = useRouter();
  const { settings } = useBackend();

  useEffect(() => {
    if (settings.selectedPage) {
      router.replace(settings.selectedPage);
    }
  }, [router, settings]);
  return <div className="relative flex h-screen w-full flex-col overflow-hidden" />;
}
