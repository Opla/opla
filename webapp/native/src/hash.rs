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

use std::cmp::Ordering;

use sha2::{ Digest, Sha256 };

#[derive(Clone, Debug)]
pub struct Hasher {
    signature: Option<String>,
    hasher: Sha256,
}

impl Hasher {
    pub fn new(sha: Option<String>) -> Self {
        let hasher = Sha256::new();
        let signature = match sha {
            Some(signature) => Some(signature),
            None => None,
        };
        Hasher {
            signature,
            hasher,
        }
    }

    pub fn update(&mut self, data: &[u8]) {
        if self.signature.is_some() {
            self.hasher.update(data);
        }
    }

    pub fn compare_signature(&mut self) -> bool {
        let digest = self.get_digest();
        match &self.signature {
            Some(signature) => {
                println!("match signature and digest {} {}", signature, digest);
                if digest.cmp(signature) != Ordering::Equal {
                    return false;
                }
             },
            None => (),
        }
        true
    }

    pub fn get_digest(&mut self) -> String {
        if self.signature.is_some() {
            return format!("{:X}",self.hasher.clone().finalize()).to_lowercase();
        }
        "".to_string()
    }
}
