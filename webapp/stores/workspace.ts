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

import { StateCreator } from 'zustand';
import { Project, Workspace } from '@/types';
import { Emitter, GlobalAppState, StateEvent, StorageProps, StorageState } from './types';

interface WorkspaceProps extends StorageProps {
  activeWorkspaceId?: string;
  workspaces: Record<string, Workspace>;
  projects: Record<string, Project>;
}

export interface WorkspaceSlice extends WorkspaceProps {
  isLoading: () => boolean;
  getAllWorkspaces: () => Workspace[];
  getWorkspace: (id?: string) => Workspace | undefined;
  loadWorkspace: (id?: string) => Workspace | undefined;
  loadProject: (id?: string) => Project | undefined;
}

export type WorkspaceStore = ReturnType<typeof createWorkspaceSlice>;

const DEFAULT_PROPS: WorkspaceProps = {
  state: StorageState.INIT,
  workspaces: {},
  projects: {},
};

const createWorkspaceSlice =
  (emit: Emitter, initProps?: Partial<WorkspaceSlice>): StateCreator<WorkspaceSlice> =>
  (set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    isLoading: () => get().state === StorageState.INIT || get().state === StorageState.LOADING,
    getAllWorkspaces: () => Object.values(get().workspaces),
    getWorkspace: (id = get().activeWorkspaceId) => (id ? get().workspaces[id] : undefined),
    loadWorkspace: (id = get().activeWorkspaceId) => {
      if (get().state !== StorageState.LOADING) {
        set({ ...get(), state: StorageState.LOADING });
        emit(StateEvent.WORKSPACE, GlobalAppState.ACTIVE, id);
      }
      const w = id ? get().workspaces[id] : undefined;
      return w;
    },
    loadProject: (id) => {
      const p = id ? get().projects[id] : undefined;
      emit(StateEvent.WORKSPACE, GlobalAppState.PROJECT, p);
      return p;
    },
  });

export default createWorkspaceSlice;
