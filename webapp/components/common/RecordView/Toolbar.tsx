// Copyright 2024 mik
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

// import useTranslation from '@/hooks/useTranslation';

export type ToolbarProps = {
  title: string;
  actions?: React.ReactNode;
};

export default function Toolbar({ title, actions }: ToolbarProps) {
  // const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center text-sm">
      <div className="flex w-full flex-row items-center justify-between gap-1 bg-neutral-50 p-2 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
        <div className="flex flex-row items-center  px-2">
          <span className="truncate px-2 dark:text-neutral-300">{title}</span>
        </div>
        <div className="flex flex-grow flex-row-reverse items-center gap-4">{actions}</div>
      </div>
    </div>
  );
}
