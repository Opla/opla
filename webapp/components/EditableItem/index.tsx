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

export default function EditableItem({
  id,
  title,
  className,
  editable = false,
  onChange,
}: {
  id: string;
  title: string;
  className?: string;
  editable?: boolean;
  onChange?: (value: string, id: string) => void;
}) {
  if (editable) {
    return (
      <input
        type="text"
        className="border-none bg-transparent outline-none"
        value={title}
        onChange={(e) => {
          e.preventDefault();
          onChange?.(e.target.value, id);
        }}
      />
    );
  }
  return <div className={className}>{title}</div>;
}
