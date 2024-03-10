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

mod encodings;
mod vendors;

use std::collections::HashSet;
use vendors::tiktoken::Rank;

use crate::encodings::cl100k_base_singleton;

pub fn encode_gpt(text: String) -> Result<Vec<Rank>, String> {
    let allowed_special = HashSet::new();
    let ranks = cl100k_base_singleton().encode(&text, allowed_special);
    Ok(ranks)
}

pub fn encode(text: String, model: String, encoding: Option<String>) -> Result<Vec<Rank>, String> {
    if model.starts_with("gpt") {
        return encode_gpt(text);
    }
    if encoding.is_some() {
        return Err("Encoding not supported".to_string());
    }
    Err("Model not supported".to_string())
}

#[cfg(test)]
mod tests {
    use super::encode;

    #[test]
    fn it_works() {
        let result = encode("hello".to_string(), "gpt".to_string(), None);
        assert_eq!(result.ok(), Some(vec![5]));
    }
}
