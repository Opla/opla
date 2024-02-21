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

import { Button } from '@/components/ui/button';

type EmptyViewProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonLabel: string;
  onCreateItem?: () => void;
};
function EmptyView({ title, description, icon, buttonLabel, onCreateItem }: EmptyViewProps) {
  return (
    <div className="flex h-[350px] shrink-0 items-center justify-center rounded-md border border-dashed">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        {icon}
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">{description}</p>
        <Button onClick={onCreateItem}>{buttonLabel}</Button>
      </div>
    </div>
  );
}

export default EmptyView;
