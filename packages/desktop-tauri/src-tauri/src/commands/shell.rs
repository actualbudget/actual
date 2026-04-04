use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub async fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_in_file_manager(app: AppHandle, filepath: String) -> Result<(), String> {
    app.opener()
        .reveal_item_in_dir(filepath)
        .map_err(|e| e.to_string())
}
