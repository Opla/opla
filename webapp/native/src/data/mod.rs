// Copyright 2024 mik
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

use serde::{ self, Deserialize, Deserializer };
use std::fmt;
use std::marker::PhantomData;
use std::str::FromStr;
use serde::de::{ self, Visitor, MapAccess };
use void::Void;

pub mod model;

pub mod date_format {
    use chrono::{ DateTime, Utc };
    use serde::{ Deserializer, Deserialize };

    const FORMAT: &str = "%Y-%m-%dT%H:%M:%S%.fZ";

    pub fn deserialize<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
        where D: Deserializer<'de>
    {
        let s = String::deserialize(deserializer)?;
        /* println!("Parsing date: {}", s);
        let datetime = NaiveDateTime::parse_from_str(&s, FORMAT).expect("Failed to parse date");
        println!("Parsed date: {:?}", datetime);
        let datetime = DateTime::parse_from_rfc3339(&s).expect("Failed to parse date");
        println!("Parsed date: {:?}", datetime); */
        Ok(DateTime::parse_from_rfc3339(&s).map_err(serde::de::Error::custom)?.with_timezone(&Utc))
    }

    pub fn serialize<S>(date: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
        where S: serde::Serializer
    {
        let s = date.format(FORMAT).to_string();
        serializer.serialize_str(&s)
    }
}

pub mod option_date_format {
    use chrono::{ DateTime, Utc };
    use serde::{ Deserializer, Deserialize };

    // const FORMAT: &str = "%Y-%m-%dT%H:%M:%S%.%f%z";

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
        where D: Deserializer<'de>
    {
        let s = Option::<String>::deserialize(deserializer)?;
        // println!("Parsing date: {:?}", s);
        let datetime = match s {
            Some(s) =>
                DateTime::parse_from_rfc3339(&s)
                    .map_err(serde::de::Error::custom)?
                    .with_timezone(&Utc),
            None => {
                return Ok(None);
            }
        };
        // println!("Parsed date: {:?}", datetime);
        Ok(Some(datetime))
    }

    pub fn serialize<S>(date: &Option<DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>
        where S: serde::Serializer
    {
        match date {
            Some(date) => {
                // println!("Serializing date: {:?}", date);
                let s = date.with_timezone(&Utc).to_rfc3339(); // date.format(FORMAT);
                // println!("Serialized date: {}", s);
                serializer.serialize_str(&s)
            }
            None => serializer.serialize_none(),
        }
    }
}

pub fn string_or_struct<'de, T, D>(deserializer: D) -> Result<T, D::Error>
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
            match FromStr::from_str(value) {
                Ok(v) => Ok(v),
                Err(_) => Err(de::Error::custom("invalid string")),
            }
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

pub fn option_string_or_struct<'de, T, D>(deserializer: D) -> Result<Option<T>, D::Error>
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
