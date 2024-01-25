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

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShortcutBadge } from '../ShortCut';

function Content({ icon }: { icon: LucideIcon }) {
  const Icon = icon as LucideIcon;
  return (
    <div className="h-5 w-5 hover:text-neutral-800 dark:hover:text-neutral-100">
      <Icon size="28px" strokeWidth={1.5} />
    </div>
  );
}

export default function SidebarItem({
  href,
  selected,
  name,
  icon,
  shortcut,
  modal,
  onModalClick,
}: {
  href?: string;
  selected: boolean;
  name: string;
  icon?: LucideIcon;
  shortcut?: string;
  modal?: boolean;
  onModalClick: (href: string) => void;
}) {
  const className = `flex h-6 w-6 rounded-md ${
    selected ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'
  } dark:transparent`;
  const content = <Content icon={icon as LucideIcon} />;
  return (
    <li className="p-2 py-4">
      <Tooltip>
        <TooltipTrigger asChild>
          {modal ? (
            <div
              className={className}
              role="button"
              tabIndex={0}
              onKeyUp={() => {
                // e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                onModalClick(href as string);
              }}
            >
              {content}
            </div>
          ) : (
            <Link className={className} href={href as string}>
              {content}
            </Link>
          )}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} className="mt-1">
          <div className="flex w-full flex-row gap-2">
            <p>{name}</p>
            {shortcut && <ShortcutBadge command={shortcut} />}
          </div>
        </TooltipContent>
      </Tooltip>
    </li>
  );
}
