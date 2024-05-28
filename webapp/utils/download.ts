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

const formatFileSize = (bytes: number, fractionDigits = 2) => {
  if (bytes === 0 || bytes === undefined || bytes === null) return '0 b';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  if (bytes < 1) {
    return `${parseFloat(bytes.toFixed(fractionDigits))} ${sizes[3]}`;
  }

  const k = 1000;

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(fractionDigits))} ${sizes[i]}`;
};

// eslint-disable-next-line import/prefer-default-export
export { formatFileSize };
