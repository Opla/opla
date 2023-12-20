// Copyright 2023 mik
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

use reqwest::Error;
use chrono::{ DateTime, Utc };
use serde::{ self, Deserialize, Serialize };

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Model {
    pub name: String,
    // #[serde(with = "option_date_format")]
    // pub created_at: Option<DateTime<Utc>>,
    // #[serde(with = "option_date_format")]
    // pub updated_at: Option<DateTime<Utc>>,
    pub id: Option<String>,
    // pub creator: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    // pub license: Option<String>,
    // pub author: Option<String>,
    // pub tags: Option<String>,
    pub path: Option<String>,
    pub file_name: Option<String>,
    pub url: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ModelsCollection {
    #[serde(with = "date_format")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "date_format")]
    pub updated_at: DateTime<Utc>,
    pub models: Vec<Model>,
}

pub async fn fetch_models_collection(url: &str) -> Result<ModelsCollection, Error> {
    println!("Fetching models collection from {}", url);
    let response = reqwest::get(url).await?;
    let collection: ModelsCollection = response.json::<ModelsCollection>().await?;
    println!("Fetched models collection: {:?}", collection);
    Ok(collection)
}

mod date_format {
    use chrono::{ DateTime, Utc, NaiveDateTime };
    use serde::{ Deserializer, Deserialize };

    const FORMAT: &str = "%Y-%m-%dT%H:%M:%S%.fZ";

    pub fn deserialize<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
        where D: Deserializer<'de>
    {
        let s = String::deserialize(deserializer)?;
        println!("Parsing date: {}", s);
        let datetime = NaiveDateTime::parse_from_str(&s, FORMAT).expect("Error parsing date");
        println!("Parsed date: {:?}", datetime);
        let datetime = DateTime::parse_from_rfc3339(&s).expect("Error parsing date");
        println!("Parsed date: {:?}", datetime);
        Ok(DateTime::parse_from_rfc3339(&s).map_err(serde::de::Error::custom)?.with_timezone(&Utc))
    }

    pub fn serialize<S>(date: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
        where S: serde::Serializer
    {
        let s = date.format(FORMAT).to_string();
        serializer.serialize_str(&s)
    }
}

mod option_date_format {
    use chrono::{ DateTime, Utc };
    use serde::{ Deserializer, Deserialize };

    const FORMAT: &str = "%Y-%m-%dT%H:%M:%S%.%f%z";

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
        where D: Deserializer<'de>
    {
        let s = String::deserialize(deserializer)?;
        println!("Parsing date: {}", s);
        let datetime = DateTime::parse_from_rfc3339(&s)
            .map_err(serde::de::Error::custom)?
            .with_timezone(&Utc);
        println!("Parsed date: {:?}", datetime);
        Ok(Some(datetime))
    }

    pub fn serialize<S>(date: &Option<DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>
        where S: serde::Serializer
    {
        match date {
            Some(date) => {
                let s = date.format(FORMAT).to_string();
                serializer.serialize_str(&s)
            }
            None => serializer.serialize_none(),
        }
    }
}
