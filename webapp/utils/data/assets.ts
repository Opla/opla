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

import { Asset, AssetState, AssetType } from '@/types';
import { createBaseRecord } from '.';
import { validateAssets } from '../backend/commands';

export const getAssetsAsArray = (assets: Asset | Asset[] | undefined): Asset[] | undefined =>
  !assets || Array.isArray(assets) ? assets : [assets];

export const createFileAssets = async (files: string | string[], previousAssets: Asset[]) => {
  const list = Array.isArray(files) ? files : [files];
  const filteredFiles = list.filter(
    (a) => !previousAssets.some((as) => as.type === AssetType.File && as.file === a),
  );
  const createdAssets = filteredFiles.map<Asset>((file) => ({
    ...createBaseRecord<Asset>(),
    type: AssetType.File,
    state: AssetState.Pending,
    file,
  }));
  const assets = (await validateAssets(createdAssets)) || [];
  return assets;
};
