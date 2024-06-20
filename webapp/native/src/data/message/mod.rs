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

use std::str::FromStr;

use chrono::{ DateTime, Utc };
use serde::{ Deserialize, Serialize };
use void::Void;

use crate::data::{ date_format, option_string_or_struct };

use super::Metadata;

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
    #[serde(rename = "assistant")]
    Assistant,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Author {
    role: Role, // 'user' | 'system' | 'assistant';
    name: String,
    #[serde(skip_serializing_if = "Option::is_none", alias = "avatarUrl")]
    avatar_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
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

impl FromStr for Content {
    type Err = Void;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self {
            r#type: ContentType::Text,
            parts: [s.to_string()].to_vec(),
            raw: Some([s.to_string()].to_vec()),
            metadata: None,
            author: None,
        })
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Message {
    pub id: String,
    #[serde(with = "date_format", alias = "createdAt", default)]
    pub created_at: DateTime<Utc>,
    #[serde(with = "date_format", alias = "updatedAt", default)]
    pub updated_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    metadata: Option<Metadata>,

    pub author: Author,

    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub content: Option<Content>,
    #[serde(skip_serializing_if = "Option::is_none", alias = "contentHistory", default)]
    pub content_history: Option<Vec<Content>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub status: Option<MessageStatus>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub sibling: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub assets: Option<Vec<String>>,
}
