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
      <div className="h-7 w-7 hover:text-gray-800 dark:hover:text-gray-100">
        <Icon size="1.75rem" />
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
  const className = `flex h-7 w-7 rounded-md ${
    selected ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
  } dark:bg-gray-700`;
  const content = <Content name={name} icon={icon as IconType} />;
  return (
    <li className="p-2">
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
