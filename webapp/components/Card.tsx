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

export default function Card({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="m-2 max-w-sm overflow-hidden rounded bg-gray-100 hover:bg-gray-200">
      <div className="flex flex-col gap-2 p-4">
        <div className="min-h-[24px] min-w-[320px] bg-gray-300/50 text-xl font-bold">{title}</div>
        <p className="min-h-[160px] bg-gray-300/50 text-base text-gray-700">{description}</p>
      </div>
    </div>
  );
}
