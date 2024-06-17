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

import { useEffect, useState } from 'react';
import Parameter, { ParameterValue } from '@/components/common/Parameter';
import { ScrollArea } from '@/components/ui/scroll-area';
import useTranslation from '@/hooks/useTranslation';
import {
  GGUF,
  GGUFFileType,
  GGUFMetadata,
  GGUFMetadataArrayValue,
  GGUFMetadataValueType,
} from '@/types/gguf';
import { getModelFileHeader } from '@/utils/backend/commands';
import logger from '@/utils/logger';

export type ModelFileInspectorProps = {
  modelId: string;
};

const convertMetadataToParameter = (metadata: GGUFMetadata): ParameterValue => {
  if (metadata.valueType === GGUFMetadataValueType.Array) {
    const value = metadata.value as GGUFMetadataArrayValue;
    return `[:${value.len}]`;
  }
  if (metadata.key.toLowerCase() === 'general.file_type') {
    return GGUFFileType[metadata.value as GGUFFileType];
  }
  return metadata.value as ParameterValue;
};

function ModelFileInspector({ modelId }: ModelFileInspectorProps) {
  const { t } = useTranslation();
  const [modelFile, setModelFile] = useState<Partial<GGUF>>();
  useEffect(() => {
    const afunc = async () => {
      const updatedModelFile = await getModelFileHeader(modelId);
      setModelFile(updatedModelFile);
    };

    afunc();
  }, [modelId]);
  logger.info('modelfile inspector', modelFile);
  if (!modelFile) {
    return <div>Loading...</div>;
  }
  return (
    <div className="flex h-full w-full flex-col gap-2 p-4">
      <ScrollArea>
        {modelFile.fileName}
        <Parameter
          label={t('Version')}
          name="header.version"
          value={modelFile.header?.version}
          disabled
        />
        <Parameter
          label={t('Tensor count')}
          name="header.tensorCount"
          value={modelFile.header?.tensorCount}
          disabled
        />
        {modelFile.header?.metadataKv.map((data) => (
          <Parameter
            key={data.key}
            label={t(data.key)}
            name={data.key}
            value={convertMetadataToParameter(data)}
            disabled
          />
        ))}
      </ScrollArea>
    </div>
  );
}

export default ModelFileInspector;
