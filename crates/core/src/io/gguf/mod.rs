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

use std::{ fmt::{ self, Display, Formatter }, fs::File, io::{ BufReader, Read } };
use serde::{ Deserialize, Serialize };

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum GGUFMetadataValueType {
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

impl TryFrom<u32> for GGUFMetadataValueType {
    type Error = String;

    fn try_from(item: u32) -> Result<Self, Self::Error> {
        Ok(match item {
            0 => GGUFMetadataValueType::UInt8,
            1 => GGUFMetadataValueType::Int8,
            2 => GGUFMetadataValueType::UInt16,
            3 => GGUFMetadataValueType::Int16,
            4 => GGUFMetadataValueType::UInt32,
            5 => GGUFMetadataValueType::Int32,
            6 => GGUFMetadataValueType::Float32,
            7 => GGUFMetadataValueType::Bool,
            8 => GGUFMetadataValueType::String,
            9 => GGUFMetadataValueType::Array,
            10 => GGUFMetadataValueType::UInt64,
            11 => GGUFMetadataValueType::Int64,
            12 => GGUFMetadataValueType::Float64,
            _ => {
                return Err(format!("invalid gguf metadata type 0x{:x}", item));
            }
        })
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum GGUFMetadataValue {
    Uint8(u8),
    Int8(i8),
    Uint16(u16),
    Int16(i16),
    Uint32(u32),
    Int32(i32),
    Float32(f32),
    Uint64(u64),
    Int64(i64),
    Float64(f64),
    Bool(bool),
    String(String),
    Array(GGUFMetadataArrayValue),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GGUFMetadataArrayValue {
    pub value_type: GGUFMetadataValueType,
    pub len: u64,
    pub value: Vec<GGUFMetadataValue>,
}

impl Display for GGUFMetadataValue {
    fn fmt(&self, fmt: &mut Formatter) -> fmt::Result {
        let str: String = match self {
            /* GGUFMetadataValue::Uint8(v) => v.to_string(),
            GGUFMetadataValue::Int8(v) => v.to_string(),
            GGUFMetadataValue::Uint16(v) => v.to_string(),
            GGUFMetadataValue::Int16(v) => v.to_string(),
            GGUFMetadataValue::Uint32(v) => v.to_string(),
            GGUFMetadataValue::Int32(v) => v.to_string(),
            GGUFMetadataValue::Float32(v) => v.to_string(),
            GGUFMetadataValue::Uint64(v) => v.to_string(),
            GGUFMetadataValue::Int64(v) => v.to_string(),
            GGUFMetadataValue::Float64(v) => v.to_string(),
            GGUFMetadataValue::Bool(v) => v.to_string(), */
            GGUFMetadataValue::String(v) => v.to_string(),
            GGUFMetadataValue::Array(v) => format!("[:{:?}]", v.len),
            _ => format!("{:?}", self),
        };
        fmt.write_str(&str)?;
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GGUFMetadata {
    pub key: String,
    pub value_type: GGUFMetadataValueType,
    pub value: GGUFMetadataValue,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GGUFHeader {
    pub version: u32,
    pub tensor_count: u64,
    pub metadata_kv_count: u64,
    pub metadata_kv: Vec<GGUFMetadata>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GGUF {
    pub file_name: String,
    pub header: GGUFHeader,
}

impl GGUF {
    pub fn new(file_name: &str) -> GGUF {
        GGUF {
            file_name: file_name.to_string(),
            header: GGUFHeader {
                version: 0,
                tensor_count: 0,
                metadata_kv_count: 0,
                metadata_kv: Vec::new(),
            },
        }
    }

    fn parse_metadata_value(
        &mut self,
        reader: &mut BufReader<File>,
        value_type: &GGUFMetadataValueType
    ) -> Result<GGUFMetadataValue, anyhow::Error> {
        match value_type {
            GGUFMetadataValueType::UInt8 => {
                let mut value = [0; 1];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Uint8(value[0]))
            }
            GGUFMetadataValueType::Int8 => {
                let mut value = [0; 1];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Int8(value[0] as i8))
            }
            GGUFMetadataValueType::UInt16 => {
                let mut value = [0; 2];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Uint16(u16::from_le_bytes(value)))
            }
            GGUFMetadataValueType::Int16 => {
                let mut value = [0; 2];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Int16(i16::from_le_bytes(value)))
            }
            GGUFMetadataValueType::UInt32 => {
                let mut value = [0; 4];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Uint32(u32::from_le_bytes(value)))
            }
            GGUFMetadataValueType::Int32 => {
                let mut value = [0; 4];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Int32(i32::from_le_bytes(value)))
            }
            GGUFMetadataValueType::Float32 => {
                let mut value = [0; 4];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Float32(f32::from_le_bytes(value)))
            }
            GGUFMetadataValueType::Bool => {
                let mut value = [0; 1];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Bool(value[0] != 0))
            }
            GGUFMetadataValueType::String => {
                let mut value_length = [0; 8];
                reader.read_exact(&mut value_length)?;
                let length = u64::from_le_bytes(value_length) as usize;

                let mut value = vec![0; length];
                reader.read_exact(&mut value)?;
                let value = String::from_utf8(value)?;
                // println!("String length: {} value: {}", length, value);
                Ok(GGUFMetadataValue::String(value))
            }
            GGUFMetadataValueType::Array => {
                let mut value_type = [0; 4];
                reader.read_exact(&mut value_type)?;
                let value_type = u32::from_le_bytes(value_type);
                let value_type = GGUFMetadataValueType::try_from(value_type).map_err(|err|
                    anyhow::Error::msg(err.to_string())
                )?;

                let mut value_length = [0; 8];
                reader.read_exact(&mut value_length)?;
                let length = u64::from_le_bytes(value_length) as usize;
                // println!("Array length: {} type: {:?}", length, value_type);
                let mut value = Vec::new();
                for _ in 0..length {
                    value.push(self.parse_metadata_value(reader, &value_type)?);
                }

                Ok(
                    GGUFMetadataValue::Array(GGUFMetadataArrayValue {
                        value_type,
                        len: length as u64,
                        value,
                    })
                )
            }
            GGUFMetadataValueType::UInt64 => {
                let mut value = [0; 8];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Uint64(u64::from_le_bytes(value)))
            }
            GGUFMetadataValueType::Int64 => {
                let mut value = [0; 8];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Int64(i64::from_le_bytes(value)))
            }
            GGUFMetadataValueType::Float64 => {
                let mut value = [0; 8];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Float64(f64::from_le_bytes(value)))
            }
        }
    }

    fn parse_metadata_kv(&mut self, reader: &mut BufReader<File>) -> Result<(), anyhow::Error> {
        let mut key_length = [0; 8];
        let mut value_type = [0; 4];
        for _ in 0..self.header.metadata_kv_count {
            reader.read_exact(&mut key_length)?;
            let length = u64::from_le_bytes(key_length) as usize;

            let mut key = vec![0; length];
            reader.read_exact(&mut key)?;
            let key = String::from_utf8(key)?;

            reader.read_exact(&mut value_type)?;
            let value_type = u32::from_le_bytes(value_type);
            let value_type = GGUFMetadataValueType::try_from(value_type).map_err(|err|
                anyhow::Error::msg(err.to_string())
            )?;

            let value = self.parse_metadata_value(reader, &value_type)?;

            println!("{}={}", key, value);

            self.header.metadata_kv.push(GGUFMetadata {
                key,
                value,
                value_type,
            });
        }
        Ok(())
    }

    pub fn read(&mut self, path: &str) -> Result<(), String> {
        println!("Reading GGUF file: {}", path);

        let input = File::open(path).map_err(|err| err.to_string())?;
        let mut reader = BufReader::new(input);

        let mut header = [0; 8];
        reader.read_exact(&mut header).map_err(|err| err.to_string())?;

        if header[0] != 0x47 && header[1] != 0x47 && header[2] != 0x55 && header[3] != 0x46 {
            return Err("Not valid GGUF".to_string());
        }

        // Models are little-endian by default.
        self.header.version = u32::from_le_bytes([header[4], header[5], header[6], header[7]]);
        println!("Version: {}", self.header.version);

        reader.read_exact(&mut header).map_err(|err| err.to_string())?;

        self.header.tensor_count = u64::from_le_bytes(header);
        println!("Tensor_count: {}", self.header.tensor_count);

        reader.read_exact(&mut header).map_err(|err| err.to_string())?;

        self.header.metadata_kv_count = u64::from_le_bytes(header);
        println!("Metadata_kv_count: {}", self.header.metadata_kv_count);

        self.parse_metadata_kv(&mut reader).map_err(|err| err.to_string())?;

        Ok(())
    }
}
