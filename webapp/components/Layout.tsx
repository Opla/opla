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

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import '@/app/globals.css';
import Sidebar from '@/features/Sidebar';
import useBackendContext from '@/hooks/useBackendContext';
import useRegisterModals from '@/hooks/useRegisterModals';
import useShortcuts, { ShortcutIds } from '@/hooks/useShortcuts';
import Modals, { ModalIds } from '@/modals';
import { Toaster } from '@/components/ui/Toast';
import logger from '@/utils/logger';
import { Page } from '@/types/ui';
import useTheme from '@/hooks/useTheme';
import { useProviderStore, useServerStore } from '@/stores';
import Statusbar from './common/Statusbar';
import { TooltipProvider } from './ui/tooltip';
import Loading from './common/Loading';

export default function Layout({ children }: { children: React.ReactNode }) {
  const firstRender = useRef(true);

  const { providers } = useProviderStore();
  const router = useRouter();
  const { serverConfig: config } = useServerStore();
  const { startBackend, disconnectBackend, settings, setSettings } = useBackendContext();

  const { showModal } = useRegisterModals(Modals);
  const { toggleTheme } = useTheme();

  useEffect(() => {
    if (firstRender.current && providers) {
      firstRender.current = false;
      startBackend();
    }
    return () => {
      disconnectBackend();
    };
  }, [providers, disconnectBackend, startBackend]);

  useEffect(() => {
    const handleRouteChange = (url: any) => {
      // const { settings } = config;
      if (settings.selectedPage !== url) {
        settings.selectedPage = url;
        delete settings.pages?.[url]?.selectedId;
        setSettings(settings);
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [settings, router, setSettings]);

  useShortcuts(ShortcutIds.DISPLAY_THREADS, (e) => {
    e.preventDefault();
    logger.info('shortcut #display-threads', e);
    router.push(Page.Threads);
  });

  useShortcuts(ShortcutIds.DISPLAY_MODELS, (e) => {
    e.preventDefault();
    logger.info('shortcut #display-models', e);
    router.push(Page.Models);
  });

  useShortcuts(ShortcutIds.DISPLAY_PROVIDERS, (e) => {
    e.preventDefault();
    logger.info('shortcut #display-providers', e);
    router.push(Page.Providers);
  });

  useShortcuts(ShortcutIds.DISPLAY_SETTINGS, (e) => {
    e.preventDefault();
    logger.info('shortcut #display-settings', e);
    showModal(ModalIds.Settings);
  });

  useShortcuts(ShortcutIds.DISPLAY_SHORTCUTS, (e) => {
    e.preventDefault();
    logger.info('shortcut #display-shortcuts', e);
    showModal(ModalIds.Shortcuts);
  });

  useShortcuts(ShortcutIds.TOGGLE_DARKMODE, (e) => {
    e.preventDefault();
    logger.info('shortcut #toggle-darkmode', e);
    toggleTheme();
  });

  if (!config || !providers) {
    return <Loading />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden select-none">
      <TooltipProvider>
        <Sidebar />
        <div className="flex grow flex-col">
          {children}
          <Statusbar />
        </div>
      </TooltipProvider>
      <Toaster />
    </div>
  );
}
