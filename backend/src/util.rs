pub fn get_env_key(key: &str) -> String {
    let msg = format!("Missing {}", key);
    std::env::var(key).expect(&msg)
}
