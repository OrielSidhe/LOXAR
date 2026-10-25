use tauri_plugin_sql::{Builder, Migration, MigrationKind};
use keyring::Entry;
use tauri::{
  AppHandle, 
  Manager, 
  WebviewWindow, 
  WebviewUrl,
  tray::TrayIconBuilder,
  menu::{Menu, MenuItem},
};
use tauri_plugin_global_shortcut::{Shortcut, GlobalShortcutExt};
use std::process::exit;
use std::str::FromStr;

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

/// FB1/FB2: Toggle the widget window.
/// Creates an always-on-top widget window if it doesn't exist.
/// This function is called both from frontend invoke and from tray/shortcut handlers.
fn toggle_widget_internal(app: &AppHandle) {
    if let Some(widget) = app.get_webview_window("widget") {
        let _ = widget.set_always_on_top(true);
        let _ = widget.show();
        let _ = widget.set_focus();
        return;
    }
    
    // Create new widget window
    let result = WebviewWindow::builder(app, "widget", WebviewUrl::App("widget.html".into()))
        .inner_size(320.0, 420.0)
        .always_on_top(true)
        .decorations(false)
        .skip_taskbar(true)
        .build();
    
    if let Ok(webview) = result {
        let _ = webview.show();
        let _ = webview.set_focus();
    }
}

/// FB1/FB2: Show the main app window.
fn show_main_app_internal(app: &AppHandle) {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.set_focus();
    }
}

#[tauri::command]
fn toggle_widget(app: AppHandle) -> Result<(), String> {
    toggle_widget_internal(&app);
    Ok(())
}

#[tauri::command]
fn show_main_app(app: AppHandle) -> Result<(), String> {
    show_main_app_internal(&app);
    Ok(())
}

#[tauri::command]
fn exit_app() {
    exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // SQLite migration
  let migrations = vec![Migration {
    version: 1,
    description: "create lexicons table",
    sql: "CREATE TABLE IF NOT EXISTS lexicons (name TEXT PRIMARY KEY, data TEXT NOT NULL);",
    kind: MigrationKind::Up,
  }];

  tauri::Builder::default()
    .plugin(Builder::default()
      .add_migrations("sqlite:loxar.db", migrations)
      .build()
    )
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .setup(|app| {
        let app_handle = app.handle().clone();
        
        // FB1: Create tray icon with menu of 3 items
        let show_widget_item = MenuItem::with_id(&app_handle, "showWidget", "Mostrar widget", true, None::<&str>)?;
        let show_app_item = MenuItem::with_id(&app_handle, "showApp", "Mostrar app", true, None::<&str>)?;
        let exit_app_item = MenuItem::with_id(&app_handle, "exitApp", "Salir", true, None::<&str>)?;
        
        let menu = Menu::with_items(&app_handle, &[&show_widget_item, &show_app_item, &exit_app_item])?;
        
        let tray_result = TrayIconBuilder::new()
            .menu(&menu)
            .tooltip("Loxar - Conlang Lexicon Manager")
            .build(&app_handle);
        
        // Set up tray menu event handler
        if let Ok(tray_icon) = tray_result {
            let _ = tray_icon.on_menu_event(move |app: &tauri::AppHandle, event| {
                let event_id = event.id();
                // MenuId comparison: `&MenuId == &str`
                if event_id == "showWidget" {
                    toggle_widget_internal(app);
                } else if event_id == "showApp" {
                    show_main_app_internal(app);
                } else if event_id == "exitApp" {
                    exit(0);
                }
            });
        }
        
        // FB2: Register global shortcut Ctrl+Alt+K with handler
        if let Ok(shortcut) = Shortcut::from_str("Ctrl+Alt+K") {
            let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, _event| {
                toggle_widget_internal(_app);
            });
        }
        
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![get_secret, set_secret, delete_secret, toggle_widget, show_main_app, exit_app])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
