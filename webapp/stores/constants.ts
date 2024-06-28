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

export enum GlobalAppState {
  ACTIVE = 0,
  WORKSPACE = 1,
  ERROR = 2,
  PROJECT = 3,

  CONVERSATIONS = 4,
  DELETECONVERSATION = 5,
  ARCHIVES = 6,
  CONVERSATIONMESSAGES = 7,
  MESSAGES = 8,

  PRESETS = 9,
}

export const EVENTS: {
  STATE_CHANGE_EVENT: string;
  STATE_SYNC_EVENT: string;
} = {
  STATE_CHANGE_EVENT: 'state_change_event',
  STATE_SYNC_EVENT: 'state_sync_event',
};

export type Emitter = (key: number, value: any) => Promise<void>;
