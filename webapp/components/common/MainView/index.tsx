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

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../ui/resizable';

type MainViewProps = {
  selectedId?: string;
  explorer: React.ComponentType<{
    selectedId?: string;
  }>;
  contentView: React.ComponentType<{
    selectedId?: string;
  }>;
};

export default function MainView({
  selectedId,
  explorer: Explorer,
  contentView: ContentView,
}: MainViewProps) {
  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel id="explorer" defaultSize={20}>
        <Explorer selectedId={selectedId} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel id="content">
        <ContentView selectedId={selectedId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
