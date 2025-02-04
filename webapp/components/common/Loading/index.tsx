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

import Opla from '@/components/icons/Opla';

function Loading() {
  const circleCommonClasses = 'h-2.5 w-2.5 bg-muted rounded-full';

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <Opla className="mb-8 h-10 w-10" />
      <div className="flex">
        <div className={`${circleCommonClasses} mr-1 animate-bounce`} />
        <div className={`${circleCommonClasses} animate-bounce200 mr-1`} />
        <div className={`${circleCommonClasses} animate-bounce400`} />
      </div>
    </div>
  );
}

export default Loading;
