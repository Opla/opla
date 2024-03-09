
pub fn encode(text: String) -> Vec<usize> {
    // TODO
    [text.len()].to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = encode("hello".to_string());
        assert_eq!(result, [5]);
    }
}
