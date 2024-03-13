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

use chrono::{ DateTime, Utc };
use serde::{ self, Deserialize, Serialize };
use serde_with::{ serde_as, OneOrMany, formats::PreferOne };
use crate::data::{ option_date_format, option_string_or_struct };

use super::{ Avatar, Entity, Preset, Resource };

#[serde_as]
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Assistant {
    pub id: Option<String>,
    pub name: String,
    pub parent_id: Option<String>,
    #[serde(with = "option_date_format", skip_serializing_if = "Option::is_none", default)]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(with = "option_date_format", skip_serializing_if = "Option::is_none", default)]
    pub updated_at: Option<DateTime<Utc>>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub avatar: Option<Avatar>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub summary: Option<String>,
    pub version: Option<String>,
    pub creator: Option<String>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub author: Option<Entity>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub license: Option<Entity>,

    #[serde_as(deserialize_as = "Option<OneOrMany<_, PreferOne>>")]
    pub languages: Option<Vec<String>>,

    #[serde_as(deserialize_as = "Option<OneOrMany<_, PreferOne>>")]
    pub tags: Option<Vec<String>>,
    pub deprecated: Option<bool>,
    pub readonly: Option<bool>,
    pub private: Option<bool>,
    pub featured: Option<bool>,

    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub repository: Option<Resource>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub download: Option<Resource>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub documentation: Option<Resource>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub include: Option<Vec<Assistant>>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub system: Option<String>,

    pub targets: Option<Vec<Preset>>,
}
