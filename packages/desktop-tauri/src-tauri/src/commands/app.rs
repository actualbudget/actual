use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapData {
    pub version: String,
    pub is_dev: bool,
}

#[tauri::command]
pub fn get_bootstrap_data(app: AppHandle) -> BootstrapData {
    let version = app
        .config()
        .version
        .clone()
        .unwrap_or_else(|| "0.0.0".to_string());
    let is_dev = cfg!(debug_assertions);

    BootstrapData { version, is_dev }
}

#[tauri::command]
pub async fn relaunch(app: AppHandle) -> Result<(), String> {
    // Kill sidecar processes before relaunch
    crate::sidecar::stop_backend(&app).await;

    app.restart();

    #[allow(unreachable_code)]
    Ok(())
}

#[tauri::command]
pub fn set_theme(app: AppHandle, theme: String) -> Result<(), String> {
    // Emit theme change to the frontend
    use tauri::Emitter;
    app.emit("theme-changed", &theme)
        .map_err(|e| e.to_string())?;

    // Persist theme in global prefs via frontend
    if let Some(window) = app.get_webview_window("main") {
        let js = format!(
            "if (window.__actionsForMenu) {{ window.__actionsForMenu.saveGlobalPrefs({{ prefs: {{ theme: '{}' }} }}); }}",
            theme.replace('\'', "\\'")
        );
        let _: Result<(), _> = window.eval(&js);
    }

    Ok(())
}
