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

import { PiMagnifyingGlass } from 'react-icons/pi';

export default function Searchbar() {
  return (
    <div className="w-full overflow-hidden rounded-lg">
      <div className="flex">
        <div className="w-full p-1">
          <div className="relative">
            <PiMagnifyingGlass className="absolute left-4 top-3 text-neutral-400" />
            <input
              type="text"
              className="w-full rounded-lg bg-neutral-100 p-2 px-12 hover:cursor-pointer focus:outline-none dark:bg-neutral-800"
              name=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}
