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
import { BiSolidCircle, BiCloudDownload } from 'react-icons/bi';

export default function Statusbar() {
  const running = false;
  return (
    <div className="m-0 flex w-full flex-row gap-4 bg-cyan-300 px-2 py-1 text-xs dark:bg-cyan-700">
      <div className="flex flex-row items-center justify-center gap-1">
        <span className={`${running ? 'text-green-500' : 'text-red-500'} `}>
          <BiSolidCircle />
        </span>
        <span>Server is starting</span>
      </div>
      <div className="flex flex-row items-center justify-center gap-1">
        <BiCloudDownload />
        <span>Zephyr... downloading 10%</span>
      </div>
    </div>
  );
}
