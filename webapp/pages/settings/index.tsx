// Copyright 2023 mik
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

import ToggleTheme from '@/components/ToggleTheme';

export default function Settings() {
  return (
    <main className="flex h-screen flex-col items-center justify-center">
      <h2 className="text-center text-gray-800">LIGHT MODE</h2>
      <h2 className="text-center text-white">DARK MODE</h2>
      <ToggleTheme />
    </main>
  );
}
