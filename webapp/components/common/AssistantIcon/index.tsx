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

import { Bot } from 'lucide-react';
import { AvatarIcon as Icon } from '@/types';

type AssistantIconProps = {
  icon?: Icon;
  name?: string;
  className?: string;
};
function AssistantIcon({ icon, name, className }: AssistantIconProps) {
  return icon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={icon.url} alt={name} className={className} />
  ) : (
    <Bot className={className} strokeWidth={1.5} />
  );
}

export default AssistantIcon;
