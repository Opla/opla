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

import NavContainer from '@/components/common/NavContainer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import useTranslation from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { Bug } from 'lucide-react';
import Link from 'next/link';

export default function Settings({
  tab,
  onTabChanged,
  children,
}: {
  tab: string;
  onTabChanged: (newTab: string) => void;
  children: React.ReactNode;
}) {
  const menu = [
    {
      name: 'Appearance',
      id: 'appearance',
      href: 'appearance',
      hrefAlias: '/settings',
    },
    {
      name: 'Storage',
      id: 'storage',
      href: 'storage',
      hrefAlias: '/settings/storage',
    },
  ];

  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-full w-full">
        <div className="navSettings">
          <NavContainer>
            <div className="text-l text-ellipsis break-all p-3 font-semibold">{t('Settings')}</div>
            <ul className="flex flex-1 flex-col gap-1 p-1">
              {menu.map((item) => (
                <li key={item.id}>
                  <div
                    className={cn(
                      item.href === tab || item.hrefAlias === tab
                        ? 'text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                        : 'text-muted-foreground',
                      'flex cursor-pointer flex-row items-center break-all rounded-md px-2 py-2 transition-colors duration-200 hover:text-accent-foreground',
                    )}
                    role="button"
                    tabIndex={0}
                    onKeyUp={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      onTabChanged(item.href);
                    }}
                  >
                    <div className="relative flex-1 overflow-hidden text-ellipsis break-all">
                      {t(item.name)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </NavContainer>
        </div>
        <div className="contentSettings h-full flex-grow p-6 pt-16">
          <div className="flex h-full flex-col pt-8">{children}</div>
        </div>
      </div>
      <div className="flex w-full items-center gap-2 p-2 text-xs text-muted-foreground">
        <span>Opla version: {process.env.NEXT_PUBLIC_SENTRY_RELEASE}</span>{' '}
        <Separator orientation="vertical" />
        <span>{process.env.NODE_ENV}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            throw new Error('Test error');
          }}
        >
          <Bug className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link
            href="https://github.com/Opla/opla/blob/main/CHANGELOG.md"
            rel="noreferrer"
            target="_blank"
          >
            Changelog
          </Link>
        </Button>
      </div>
    </div>
  );
}
