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

import { cn } from '@/lib/utils';

function Opla({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      viewBox="0 0 283.5 283.5"
      enableBackground="new 0 0 283.5 283.5"
    >
      <g>
        <g>
          <circle fill="#000000" cx="141.7" cy="141.7" r="137.5" />
        </g>
        <path
          fill="#FFFFFF"
          d="M186.5,100c-19.7-0.3-36.9,11.2-45.2,27.7c-8-16.2-24.5-27.4-43.7-27.5c-27.4-0.5-49.9,21.5-50.2,49.1
		c-0.5,27.2,21.5,49.7,48.9,50.2c19.7,0.3,36.9-11.2,45.2-27.7c8,16.2,24.5,27.4,43.7,27.5c27.4,0.5,49.9-21.5,50.2-49.1
		C235.7,122.7,213.7,100.3,186.5,100z M96.5,169.1c-10.7-0.2-19.2-9-19-19.7c0.2-10.7,9-19.2,19.7-19s19.2,9,19,19.7
		C116,160.6,107.2,169.3,96.5,169.1z M185.5,168.9c-10.7-0.2-19.2-9-19-19.7c0.2-10.7,9-19.2,19.7-19c10.7,0.2,19.2,9,19,19.7
		C205,160.6,196.1,169.1,185.5,168.9z"
        />
        <g>
          <circle fill="#FFFFFF" cx="217.2" cy="67" r="21.4" />
        </g>
      </g>
    </svg>
  );
}

export default Opla;
