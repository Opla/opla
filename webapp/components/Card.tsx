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

export default function Card({
  title,
  description,
  selected,
  onClick,
}: {
  title?: string;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const cssTitle = title ? '' : 'bg-gray-300/50 dark:bg-gray-600/50 ';
  const cssDesc = description ? '' : 'bg-gray-300/50 dark:bg-gray-600/50 ';
  const container = (
    <div className="flex h-full w-full flex-col gap-2 p-4">
      <div className={`${cssTitle}min-h-[24px] w-full text-xl font-bold`}>{title}</div>
      <p className={`${cssDesc}aspect-[4/3] text-base text-gray-700 dark:text-gray-400`}>
        {description}
      </p>
    </div>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${
        selected ? 'border-2 border-gray-800 dark:border-gray-300' : ''
      } m-2 h-full w-full overflow-hidden rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 hover:dark:bg-gray-800`}
    >
      {container}
    </button>
  ) : (
    <div
      className={`${
        selected ? 'border-b border-gray-100 dark:border-gray-800' : ''
      } m-2 h-full w-full overflow-hidden rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 hover:dark:bg-gray-800`}
    >
      {container}
    </div>
  );
}
