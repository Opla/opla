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

export enum GGMLType {
  GGML_TYPE_F32 = 0,
  GGML_TYPE_F16 = 1,
  GGML_TYPE_Q4_0 = 2,
  GGML_TYPE_Q4_1 = 3,
  GGML_TYPE_Q4_2 = 4, // support has been removed
  GGML_TYPE_Q4_3 = 5, // support has been removed
  GGML_TYPE_Q5_0 = 6,
  GGML_TYPE_Q5_1 = 7,
  GGML_TYPE_Q8_0 = 8,
  GGML_TYPE_Q8_1 = 9,
  GGML_TYPE_Q2_K = 10,
  GGML_TYPE_Q3_K = 11,
  GGML_TYPE_Q4_K = 12,
  GGML_TYPE_Q5_K = 13,
  GGML_TYPE_Q6_K = 14,
  GGML_TYPE_Q8_K = 15,
  GGML_TYPE_IQ2_XXS = 16,
  GGML_TYPE_IQ2_XS = 17,
  GGML_TYPE_IQ3_XXS = 18,
  GGML_TYPE_IQ1_S = 19,
  GGML_TYPE_IQ4_NL = 20,
  GGML_TYPE_IQ3_S = 21,
  GGML_TYPE_IQ2_S = 22,
  GGML_TYPE_IQ4_XS = 23,
  GGML_TYPE_I8 = 24,
  GGML_TYPE_I16 = 25,
  GGML_TYPE_I32 = 26,
  GGML_TYPE_I64 = 27,
  GGML_TYPE_F64 = 28,
  GGML_TYPE_IQ1_M = 29,
  GGML_TYPE_COUNT,
}

export enum GGUFFileType {
  ALL_F32 = 0,
  MOSTLY_F16 = 1,
  MOSTLY_Q4_0 = 2,
  MOSTLY_Q4_1 = 3,
  MOSTLY_Q4_1_SOME_F16 = 4,
  MOSTLY_Q4_2 = 5, // (support removed)
  MOSTLY_Q4_3 = 6, // (support removed)
  MOSTLY_Q8_0 = 7,
  MOSTLY_Q5_0 = 8,
  MOSTLY_Q5_1 = 9,
  MOSTLY_Q2_K = 10,
  MOSTLY_Q3_K_S = 11,
  MOSTLY_Q3_K_M = 12,
  MOSTLY_Q3_K_L = 13,
  MOSTLY_Q4_K_S = 14,
  MOSTLY_Q4_K_M = 15,
  MOSTLY_Q5_K_S = 16,
  MOSTLY_Q5_K_M = 17,
  MOSTLY_Q6_K = 18,
}

export enum GGUFMetadataValueType {
  // The value is a 8-bit unsigned integer.
  UInt8 = 'UInt8', // 0,
  // The value is a 8-bit signed integer.
  Int8 = 'Int8', // 1,
  // The value is a 16-bit unsigned little-endian integer.
  UInt16 = 'UInt16', // 2,
  // The value is a 16-bit signed little-endian integer.
  Int16 = 'Int16', // 3,
  // The value is a 32-bit unsigned little-endian integer.
  UInt32 = 'UInt32', // 4,
  // The value is a 32-bit signed little-endian integer.
  Int32 = 'Int32', // 5,
  // The value is a 32-bit IEEE754 floating point number.
  Float32 = 'Float32', // 6,
  // The value is a boolean.
  // 1-byte value where 0 is false and 1 is true.
  // Anything else is invalid, and should be treated as either the model being invalid or the reader being buggy.
  Bool = 'Bool', // 7,
  // The value is a UTF-8 non-null-terminated string, with length prepended.
  String = 'String', // 8,
  // The value is an array of other values, with the length and type prepended.
  ///
  // Arrays can be nested, and the length of the array is the number of elements in the array, not the number of bytes.
  Array = 'Array', // 9,
  // The value is a 64-bit unsigned little-endian integer.
  UInt64 = 'UInt64', // 10,
  // The value is a 64-bit signed little-endian integer.
  Int64 = 'Int64', // 11,
  // The value is a 64-bit IEEE754 floating point number.
  Float64 = 'Float64', // 12,
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
