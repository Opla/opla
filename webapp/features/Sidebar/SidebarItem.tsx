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
import { ShortcutIds } from '@/hooks/useShortcuts';
import { ShortcutBadge } from '../../components/common/ShortCut';

function Content({
  icon,
  renderIcon,
}: {
  icon: LucideIcon | undefined;
  renderIcon?: () => React.ReactElement;
}) {
  const Icon = icon;
  return (
    <div className="hover:primary-foreground h-5 w-5">
      {renderIcon ? renderIcon() : Icon && <Icon size="28px" strokeWidth={1.5} />}
    </div>
  );
}

export default function SidebarItem({
  href,
  target,
  selected,
  name,
  icon,
  renderIcon,
  shortcut,
  modal,
  onModalClick,
}: {
  href?: string;
  target?: boolean;
  selected: boolean;
  name: string;
  icon?: LucideIcon;
  renderIcon?: () => React.ReactElement;
  shortcut?: ShortcutIds;
  modal?: boolean;
  onModalClick: (href: string) => void;
}) {
  const className = `flex h-6 w-6 rounded-md ${
    selected ? 'text-primary' : 'text-muted-foreground hover:text-primary'
  } dark:transparent`;
  const content = <Content icon={icon} renderIcon={renderIcon} />;
  return (
    <li className="p-2">
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
                if (href) {
                  onModalClick(href);
                }
              }}
            >
              {content}
            </div>
          ) : (
            href && (
              <Link
                className={className}
                href={href}
                target={target ? '_blank' : undefined}
                rel={target ? 'noopener noreferrer' : undefined}
              >
                {content}
              </Link>
            )
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
