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

// import useTranslation from '@/hooks/useTranslation';
import Header from './Header';

export type RecordViewProps = {
  title: string | React.ReactNode;
  selectedId?: string;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
};

export default function RecordView({ title, selectedId, children, toolbar }: RecordViewProps) {
  // const { t } = useTranslation();
  return (
    <div className="flex h-full max-w-full flex-col dark:bg-neutral-800/30">
      <div className="transition-width relative flex h-full w-full flex-1 flex-col items-stretch overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <Header title={title || selectedId || ''} toolbar={toolbar} />
          {children}
        </div>
      </div>
    </div>
  );
}
