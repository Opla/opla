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

export enum GGUFMetadataValueType {
  // The value is a 8-bit unsigned integer.
  UInt8 = 0,
  // The value is a 8-bit signed integer.
  Int8 = 1,
  // The value is a 16-bit unsigned little-endian integer.
  UInt16 = 2,
  // The value is a 16-bit signed little-endian integer.
  Int16 = 3,
  // The value is a 32-bit unsigned little-endian integer.
  UInt32 = 4,
  // The value is a 32-bit signed little-endian integer.
  Int32 = 5,
  // The value is a 32-bit IEEE754 floating point number.
  Float32 = 6,
  // The value is a boolean.
  // 1-byte value where 0 is false and 1 is true.
  // Anything else is invalid, and should be treated as either the model being invalid or the reader being buggy.
  Bool = 7,
  // The value is a UTF-8 non-null-terminated string, with length prepended.
  String = 8,
  // The value is an array of other values, with the length and type prepended.
  ///
  // Arrays can be nested, and the length of the array is the number of elements in the array, not the number of bytes.
  Array = 9,
  // The value is a 64-bit unsigned little-endian integer.
  UInt64 = 10,
  // The value is a 64-bit signed little-endian integer.
  Int64 = 11,
  // The value is a 64-bit IEEE754 floating point number.
  Float64 = 12,
}

export type GGUFMetadataValue = number | boolean | string | GGUFMetadataArrayValue;

export type GGUFMetadataArrayValue = {
  valueType: GGUFMetadataValueType;
  len: number;
  value: GGUFMetadataValue[];
};

export type GGUFMetadata = {
  key: string;
  valueType: GGUFMetadataValueType;
  value: GGUFMetadataValue;
};

export type GGUFHeader = {
  version: number;
  tensorCount: number;
  metadataKvCount: number;
  metadataKv: GGUFMetadata[];
};

export type GGUF = {
  fileName: string;
  header: GGUFHeader;
};
