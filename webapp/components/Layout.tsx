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

import { useContext } from 'react';
import '@/app/globals.css';
import Sidebar from '@/components/common/Sidebar';
import { AppContext } from '@/context';
import useBackend from '@/hooks/useBackend';
import useRegisterModals from '@/hooks/useRegisterModals';
import Statusbar from './common/Statusbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { providers, models, presets } = useContext(AppContext);

  useBackend();

  useRegisterModals();

  if (!providers || !models || !presets) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full select-none overflow-hidden">
      <Sidebar />
      <div className="flex grow flex-col">
        {children}
        <Statusbar />
      </div>
    </div>
  );
}
