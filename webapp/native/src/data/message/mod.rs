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

use std::collections::HashMap;

use chrono::{ DateTime, Utc };
use serde::{ Deserialize, Serialize };

use crate::data::date_format;

#[derive(PartialEq, Clone, Debug, Serialize, Deserialize)]
pub enum MessageStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "delivered")]
    Delivered,
    #[serde(rename = "error")]
    Error,
    #[serde(rename = "stream")]
    Stream,
}

#[derive(PartialEq, Clone, Debug, Serialize, Deserialize)]
pub enum Role {
    #[serde(rename = "user")]
    User,
    #[serde(rename = "system")]
    System,
    #[serde(rename = "Assistant")]
    Assistant,
}

#[derive(PartialEq, Clone, Debug, Serialize, Deserialize)]
pub enum MetadataValue {
    String(String),
    Number(f32),
    Boolean(bool),
    Metadata(HashMap<String, MetadataValue>),
}

pub type Metadata = HashMap<String, MetadataValue>;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Author {
    role: Role, // 'user' | 'system' | 'assistant';
    name: String,
    avatar_url: Option<String>,
    metadata: Option<Metadata>,
}

#[derive(PartialEq, Clone, Debug, Serialize, Deserialize)]
pub enum ContentType {
    #[serde(rename = "text")]
    Text,
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Content {
    r#type: ContentType,
    parts: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    raw: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    metadata: Option<Metadata>,
    author: Option<Author>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Message {
    pub id: String,
    pub name: String,
    #[serde(with = "date_format", default)]
    pub created_at: DateTime<Utc>,
    #[serde(with = "date_format", default)]
    pub updated_at: DateTime<Utc>,

    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        // deserialize_with = "option_string_or_struct"
    )]
    pub content: Option<Content>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub content_history: Option<Vec<Content>>,
    pub status: MessageStatus,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub sibling: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub assets: Option<Vec<String>>,
}
