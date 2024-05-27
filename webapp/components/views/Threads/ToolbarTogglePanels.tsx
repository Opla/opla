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

import { PanelLeft, PanelLeftClose, PanelRight, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ToolbarProps = {
  displayExplorer: boolean;
  displaySettings?: boolean;
  onChangeDisplayExplorer: (value: boolean) => void;
  onChangeDisplaySettings?: (value: boolean) => void;
  disabledSettings?: boolean;
};

export default function Header({
  displayExplorer,
  displaySettings = false,
  onChangeDisplayExplorer,
  onChangeDisplaySettings = () => {},
  disabledSettings,
}: ToolbarProps) {
  return (
    <div className="flex flex-1 flex-row justify-end gap-2">
      <Button
        aria-label="Toggle thread explorer"
        variant="ghost"
        size="sm"
        className="p-1"
        onClick={() => onChangeDisplayExplorer(!displayExplorer)}
      >
        {displayExplorer ? <PanelLeftClose strokeWidth={1.0} /> : <PanelLeft strokeWidth={1.0} />}
      </Button>
      {disabledSettings !== true && (
        <Button
          aria-label="Toggle thread settings"
          variant="ghost"
          size="sm"
          className="p-1"
          onClick={() => onChangeDisplaySettings(!displaySettings)}
        >
          {displaySettings ? (
            <PanelRightClose strokeWidth={1.0} />
          ) : (
            <PanelRight strokeWidth={1.0} />
          )}
        </Button>
      )}
    </div>
  );
}
