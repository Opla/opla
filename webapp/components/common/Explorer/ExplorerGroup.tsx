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

import useTranslation from '@/hooks/useTranslation';

type ExplorerGroupProps = {
  title?: string;
  children: React.ReactNode;
};

function ExplorerGroup({ title, children }: ExplorerGroupProps) {
  const { t } = useTranslation();

  return (
    <div className="group flex h-full w-full flex-1 flex-col gap-3">
      {title && (
        <div className="p1 text-ellipsis break-all capitalize text-muted-foreground">
          {t(title)}
        </div>
      )}
      {children}
    </div>
  );
}

export default ExplorerGroup;
