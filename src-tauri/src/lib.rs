use tauri_plugin_sql::{Builder, Migration, MigrationKind};
use keyring::Entry;

// OS keychain entry for the Gemini API key. Kept out of the webview's storage.
const SECRET_SERVICE: &str = "loxar";
const SECRET_ACCOUNT: &str = "gemini-api-key";

#[tauri::command]
fn get_secret() -> Result<Option<String>, String> {
    let entry = Entry::new(SECRET_SERVICE, SECRET_ACCOUNT).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(pw) => Ok(Some(pw)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn set_secret(secret: String) -> Result<(), String> {
    let entry = Entry::new(SECRET_SERVICE, SECRET_ACCOUNT).map_err(|e| e.to_string())?;
    entry.set_password(&secret).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_secret() -> Result<(), String> {
    let entry = Entry::new(SECRET_SERVICE, SECRET_ACCOUNT).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // SQLite migration: one table that stores each lexicon as a JSON row.
  // Using a single TEXT column for the LexiconData JSON keeps all
  // serialization on the frontend side and avoids embedding large blobs
  // in source code (the corruption that broke App.tsx in 2969057).
  let migrations = vec![Migration {
    version: 1,
    description: "create lexicons table",
    sql: "CREATE TABLE IF NOT EXISTS lexicons (name TEXT PRIMARY KEY, data TEXT NOT NULL);",
    kind: MigrationKind::Up,
  }];

  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_process::init())
    .plugin(
      Builder::default()
        .add_migrations("sqlite:loxar.db", migrations)
        .build(),
    )
    .invoke_handler(tauri::generate_handler![get_secret, set_secret, delete_secret])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
