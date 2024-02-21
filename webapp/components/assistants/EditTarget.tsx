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

import { AssistantTarget } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import Parameter, { ParameterValue } from '../common/Parameter';

type EditTargetProps = {
  target: AssistantTarget;
  onChange: (target: AssistantTarget) => void;
};

function EditTarget({ target, onChange }: EditTargetProps) {
  const { t } = useTranslation();
  console.log(target, onChange);
  const handleUpdateParameter = (name: string, value: ParameterValue) => {
    console.log('update parameter:', name, value);
  };
  return (
    <div>
      <Parameter
        placeholder={t('Insert target name...')}
        inputCss="w-full"
        name="name"
        value={target.name}
        onChange={handleUpdateParameter}
      />
    </div>
  );
}

export default EditTarget;
