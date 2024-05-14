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

import { BrainCircuit } from 'lucide-react';
import { Logo as Icon } from '@/types';
import OpenAI from '@/components/icons/OpenAI';

type ModelIconProps = {
  icon?: Icon;
  name?: string;
  className?: string;
  providerName: string | undefined;
};
function ModelIcon({ icon, name, className, providerName }: ModelIconProps) {
  if (icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon.url} alt={name} className={className} />;
  }
  return providerName === 'openai' ? (
    <OpenAI className={className} />
  ) : (
    <BrainCircuit className={className} strokeWidth={1.5} />
  );
}

export default ModelIcon;
