// Copyright 2024 Mik Bry
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

import { isMac } from '@/utils/misc';

export type ToolbarProps = {
  header: string | React.ReactNode;
  toolbar?: React.ReactNode;
};

export default function Header({ header, toolbar }: ToolbarProps) {
  const isTitlebarTransparent = isMac();

  return (
    <div
      className="bg-secondary/70 flex h-11 w-full flex-row items-center justify-between gap-1 p-2 text-sm"
      data-tauri-drag-region={isTitlebarTransparent}
    >
      <div
        className="grow flex-row items-center px-2"
        data-tauri-drag-region={isTitlebarTransparent}
      >
        {typeof header === 'string' && <span className="truncate px-2">{header}</span>}
        {typeof header !== 'string' && header}
      </div>
      <div className="flex-1" data-tauri-drag-region={isTitlebarTransparent} />
      <div className="flex-0 flex-row-reverse items-center gap-4">{toolbar}</div>
    </div>
  );
}
