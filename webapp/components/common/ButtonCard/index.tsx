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

export default function ButtonCard({
  title,
  description,
  selected,
  disabled = false,
  onClick,
}: {
  title?: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const cssTitle = title ? '' : 'bg-secondary/50 ';
  const cssDesc = description ? '' : 'bg-secondary/50 ';
  const container = (
    <div className="flex h-full w-full flex-col gap-2 p-4">
      <div className={`${cssTitle}min-h-[24px] w-full text-xl font-bold`}>{title}</div>
      <div className={`${cssDesc}aspect-4/3 text-secondary-foreground text-base`}>
        <p className="line-clamp-4">{description}</p>
      </div>
    </div>
  );
  let cname = disabled ? 'cursor-default ' : 'cursor-pointer ';
  if (disabled) {
    cname += ' opacity-50 ';
  } else {
    cname += ' hover:bg-muted ';
  }
  return (
    <div
      role="button"
      aria-label="Card"
      onKeyDown={() => {}}
      tabIndex={0}
      onClick={disabled ? undefined : onClick}
      className={`${
        selected ? `${cname} border-2` : `${cname}`
      } bg-muted m-2 h-full w-full overflow-hidden rounded`}
    >
      {container}
    </div>
  );
}
