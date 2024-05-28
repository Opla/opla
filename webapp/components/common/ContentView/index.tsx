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

// import useTranslation from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import Header from './Header';

export type ContentViewProps = {
  header?: string | React.ReactNode;
  selectedId?: string;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
};

export default function ContentView({
  header,
  selectedId,
  children,
  toolbar,
  className,
}: ContentViewProps) {
  // const { t } = useTranslation();
  return (
    <div className={cn('flex h-full flex-col bg-secondary/20', className)}>
      {(header || toolbar) && <Header header={header || selectedId || ''} toolbar={toolbar} />}
      {children}
    </div>
  );
}
