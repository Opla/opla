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

use chrono::{ DateTime, Utc };
use serde::{ self, Deserialize, Serialize, Deserializer };
use serde_with::{ serde_as, OneOrMany, formats::PreferOne };
use std::fmt;
use std::marker::PhantomData;
use std::str::FromStr;
use serde::de::{ self, Visitor, MapAccess };
use void::Void;

// See https://serde.rs/string-or-struct.html
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Entity {
    pub name: String,
    pub email: Option<String>,
    pub url: Option<String>,
}
impl FromStr for Entity {
    type Err = Void;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Entity {
            name: s.to_string(),
            email: None,
            url: None,
        })
    }
}

#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Resource {
    pub url: String,
    pub name: Option<String>,
    // TODO handle filename
}
impl FromStr for Resource {
    type Err = Void;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        // TODO check if s is a valid URL or a file path
        Ok(Resource {
            url: s.to_string(),
            name: None,
        })
    }
}

#[serde_as]
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Model {
    pub id: Option<String>,
    pub name: String,
    pub base_model: Option<String>,
    #[serde(with = "option_date_format", skip_serializing_if = "Option::is_none", default)]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(with = "option_date_format", skip_serializing_if = "Option::is_none", default)]
    pub updated_at: Option<DateTime<Utc>>,
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
    pub publisher: Option<Entity>,
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
    pub recommandations: Option<String>,
    pub recommended: Option<bool>,
    pub deprecated: Option<bool>,
    pub private: Option<bool>,

    pub model_type: Option<String>, // TODO enum
    pub library: Option<String>, // TODO enum
    pub tensor_type: Option<String>, // TODO enum
    pub quantization: Option<String>, // TODO enum
    pub bits: Option<i32>,
    pub size: Option<f32>,
    pub max_ram: Option<f32>,

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
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "option_string_or_struct"
    )]
    pub paper: Option<Resource>,

    // TODO use Resource instead of String
    pub path: Option<String>,
    pub file_name: Option<String>,
    pub url: Option<String>,

    pub include: Option<Vec<Model>>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ModelsCollection {
    #[serde(with = "date_format")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "date_format")]
    pub updated_at: DateTime<Utc>,
    pub models: Vec<Model>,
}

pub async fn fetch_models_collection(
    url: &str
) -> Result<ModelsCollection, Box<dyn std::error::Error>> {
    println!("Fetching models collection from {}", url);
    let response = reqwest::get(url).await?;
    let collection = response.json::<ModelsCollection>().await?;
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
        let s = Option::<String>::deserialize(deserializer)?;
        println!("Parsing date: {:?}", s);
        if s == None {
            return Ok(None);
        }
        let datetime = DateTime::parse_from_rfc3339(&s.unwrap())
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

fn string_or_struct<'de, T, D>(deserializer: D) -> Result<T, D::Error>
    where T: Deserialize<'de> + FromStr<Err = Void>, D: Deserializer<'de>
{
    // This is a Visitor that forwards string types to T's `FromStr` impl and
    // forwards map types to T's `Deserialize` impl. The `PhantomData` is to
    // keep the compiler from complaining about T being an unused generic type
    // parameter. We need T in order to know the Value type for the Visitor
    // impl.
    struct StringOrStruct<T>(PhantomData<fn() -> T>);

    impl<'de, T> Visitor<'de> for StringOrStruct<T> where T: Deserialize<'de> + FromStr<Err = Void> {
        type Value = T;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("string or map")
        }

        fn visit_str<E>(self, value: &str) -> Result<T, E> where E: de::Error {
            Ok(FromStr::from_str(value).unwrap())
        }

        fn visit_map<M>(self, map: M) -> Result<T, M::Error> where M: MapAccess<'de> {
            // `MapAccessDeserializer` is a wrapper that turns a `MapAccess`
            // into a `Deserializer`, allowing it to be used as the input to T's
            // `Deserialize` implementation. T then deserializes itself using
            // the entries from the map visitor.
            Deserialize::deserialize(de::value::MapAccessDeserializer::new(map))
        }
    }

    deserializer.deserialize_any(StringOrStruct(PhantomData))
}

fn option_string_or_struct<'de, T, D>(deserializer: D) -> Result<Option<T>, D::Error>
    where T: Deserialize<'de> + FromStr<Err = Void>, D: Deserializer<'de>
{
    struct OptStringOrStruct<T>(PhantomData<T>);

    impl<'de, T> Visitor<'de>
        for OptStringOrStruct<T>
        where T: Deserialize<'de> + FromStr<Err = Void>
    {
        type Value = Option<T>;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("a null, a string or map")
        }

        fn visit_none<E>(self) -> Result<Self::Value, E> where E: de::Error {
            Ok(None)
        }

        fn visit_some<D>(self, deserializer: D) -> Result<Self::Value, D::Error>
            where D: Deserializer<'de>
        {
            string_or_struct(deserializer).map(Some)
        }
    }

    deserializer.deserialize_option(OptStringOrStruct(PhantomData))
}
