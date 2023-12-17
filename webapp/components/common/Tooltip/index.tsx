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

export enum Orientation {
  Left,
  Right,
  Top,
  Bottom,
}

const OrientationToCss = {
  [Orientation.Left]: 'right-10',
  [Orientation.Right]: 'left-10',
  [Orientation.Top]: 'bottom-10',
  [Orientation.Bottom]: 'top-10',
};

export default function Tooltip({
  message,
  children,
  orientation = Orientation.Bottom,
}: {
  message: string;
  children: React.ReactNode;
  orientation?: Orientation;
}) {
  const cssOrientation = OrientationToCss[orientation];

  return (
    <div className="group relative flex">
      {children}
      <span
        className={`absolute ${cssOrientation} z-10 scale-0 rounded-lg bg-neutral-600 p-2 text-xs text-white shadow-lg transition-all group-hover:scale-100 dark:bg-neutral-900`}
      >
        {message}
      </span>
    </div>
  );
}
