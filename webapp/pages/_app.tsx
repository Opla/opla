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

import { useEffect, useState } from 'react';
import { AppProps } from 'next/app';
import Layout from '@/components/Layout';
import { ThemeProvider } from 'next-themes';
import { AppContextProvider } from '@/context';
import { ModalsProvider } from '@/context/modals';
import { BackendProvider } from '@/hooks/useBackendContext';

export default function App({ Component }: AppProps) {
  // Dirty hack to fix hydration mismatch using i18n
  const [initialRenderComplete, setInitialRenderComplete] = useState<boolean>(false);
  useEffect(() => {
    setInitialRenderComplete(true);
    const listener = (e: Event) => {
      e.preventDefault();
    };
    // window.addEventListener('contextmenu', listener, false);

    return () => {
      window.removeEventListener('contextmenu', listener);
    };
  }, []);

  if (!initialRenderComplete) return <div />;
  // End of dirty hack...

  return (
    <ThemeProvider attribute="class">
      <AppContextProvider>
        <BackendProvider>
          <ModalsProvider>
            <Layout>
              <Component />
            </Layout>
          </ModalsProvider>
        </BackendProvider>
      </AppContextProvider>
    </ThemeProvider>
  );
}
