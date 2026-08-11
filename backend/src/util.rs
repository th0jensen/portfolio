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
