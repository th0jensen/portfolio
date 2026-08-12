pub fn get_env_key(key: &str) -> String {
    let msg = format!("Missing {}", key);
    std::env::var(key).expect(&msg)
}

pub fn get_env_key_or(key: &str, fallback: &str) -> String {
    std::env::var(key)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| fallback.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_env_key_returns_the_set_value() {
        // SAFETY: test-only, and this key is unique to this test.
        unsafe { std::env::set_var("UTIL_TEST_GET_ENV_KEY", "hello") };

        assert_eq!(get_env_key("UTIL_TEST_GET_ENV_KEY"), "hello");
    }

    #[test]
    #[should_panic(expected = "Missing UTIL_TEST_MISSING_KEY")]
    fn get_env_key_panics_when_unset() {
        get_env_key("UTIL_TEST_MISSING_KEY");
    }

    #[test]
    fn get_env_key_or_falls_back_when_unset_or_blank() {
        assert_eq!(
            get_env_key_or("UTIL_TEST_UNSET_KEY", "fallback"),
            "fallback"
        );

        // SAFETY: test-only, and this key is unique to this test.
        unsafe { std::env::set_var("UTIL_TEST_BLANK_KEY", "   ") };
        assert_eq!(
            get_env_key_or("UTIL_TEST_BLANK_KEY", "fallback"),
            "fallback"
        );

        // SAFETY: test-only, and this key is unique to this test.
        unsafe { std::env::set_var("UTIL_TEST_SET_KEY", "value") };
        assert_eq!(get_env_key_or("UTIL_TEST_SET_KEY", "fallback"), "value");
    }
}
