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

import { InvokeArgs } from '@tauri-apps/api/tauri';

const invokeTauri = async (command: string, args?: InvokeArgs) => {
  const { invoke } = await import('@tauri-apps/api/tauri');
  return invoke(command, args);
};

const getPlatformInfos = async () => {
  // TODO
};
export { invokeTauri, getPlatformInfos };
