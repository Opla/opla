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

import { cn } from '@/lib/utils';

type PillsProps = {
  label: string;
  className?: string;
};

export function Pill({ label, className }: PillsProps) {
  return (
    <span
      className={cn(
        'text-2xs line-clamp-1 rounded border-0 px-2.5 py-0.5 leading-3 font-extrabold',
        className,
      )}
    >
      {label}
    </span>
  );
}

export function BluePill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn('bg-blue-300 text-blue-800 dark:bg-blue-900 dark:text-blue-300', className)}
    />
  );
}

export function YellowPill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn(
        'bg-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        className,
      )}
    />
  );
}

export function PurplePill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn(
        'bg-purple-300 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        className,
      )}
    />
  );
}

export function GreenPill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn('bg-green-300 text-green-800 dark:bg-green-900 dark:text-green-300', className)}
    />
  );
}

export function RedPill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn('bg-red-300 text-red-800 dark:bg-red-900 dark:text-red-300', className)}
    />
  );
}

export function OrangePill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn(
        'bg-orange-300 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
        className,
      )}
    />
  );
}

export function GrayPill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn('bg-gray-300 text-gray-800 dark:bg-gray-900 dark:text-gray-300', className)}
    />
  );
}

export function PinkPill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn('bg-pink-300 text-pink-800 dark:bg-pink-900 dark:text-pink-300', className)}
    />
  );
}

export function IndigoPill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn(
        'bg-indigo-300 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
        className,
      )}
    />
  );
}

export function CyanPill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn('bg-cyan-300 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300', className)}
    />
  );
}

export function TealPill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn('bg-teal-300 text-teal-800 dark:bg-teal-900 dark:text-teal-300', className)}
    />
  );
}

export function LimePill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn('bg-lime-300 text-lime-800 dark:bg-lime-900 dark:text-lime-300', className)}
    />
  );
}

export function AmberPill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn('bg-amber-300 text-amber-800 dark:bg-amber-900 dark:text-amber-300', className)}
    />
  );
}

export function BrownPill({ label, className }: PillsProps) {
  return (
    <Pill
      label={label}
      className={cn('bg-brown-300 text-brown-800 dark:bg-brown-900 dark:text-brown-300', className)}
    />
  );
}
