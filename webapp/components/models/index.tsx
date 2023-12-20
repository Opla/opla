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

'use client';

import { useEffect, useState } from 'react';
import { Model } from '@/types';
import logger from '@/utils/logger';
import { getModelsCollection } from '@/utils/backend/commands';
import SplitView from '../common/SplitView';
import Explorer from './Explorer';
import ModelView from './Model';

export default function Providers({ selectedModelId }: { selectedModelId?: string }) {
  const [collection, setCollection] = useState<Model[]>([]);
  useEffect(() => {
    const getCollection = async () => {
      const coll = (await getModelsCollection()) as unknown as { models: Model[] };
      setCollection(coll.models);
    };
    getCollection();
  }, []);
  logger.info('collection: ', collection);
  return (
    <SplitView
      className="grow overflow-hidden"
      left={<Explorer selectedModelId={selectedModelId} />}
    >
      <ModelView modelId={selectedModelId} />
    </SplitView>
  );
}
