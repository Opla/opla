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

import Link from 'next/link';
import { IconType } from 'react-icons';
import Tooltip, { Orientation } from '../Tooltip';

function Content({ name, icon }: { name: string; icon: IconType }) {
  const Icon = icon as IconType;
  return (
    <Tooltip message={name} orientation={Orientation.Right}>
      <div className="h-5 w-5 hover:text-neutral-800 dark:hover:text-neutral-100">
        <Icon size="28px" />
      </div>
    </Tooltip>
  );
}

export default function SidebarItem({
  href,
  selected,
  name,
  icon,
  modal,
  onModalClick,
}: {
  href: string | undefined;
  selected: boolean;
  name: string;
  icon: IconType | undefined;
  modal?: boolean;
  onModalClick: (href: string) => void;
}) {
  const className = `flex h-6 w-6 rounded-md ${
    selected ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'
  } dark:transparent`;
  const content = <Content name={name} icon={icon as IconType} />;
  return (
    <li className="p-2 py-4">
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
    </li>
  );
}
