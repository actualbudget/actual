use tauri::AppHandle;

use crate::sidecar;

#[tauri::command]
pub async fn restart_server(app: AppHandle) -> Result<(), String> {
    sidecar::stop_backend(&app).await;
    sidecar::start_backend(&app)
        .await
        .map_err(|e| e.to_string())
}

/// Relay a message from the frontend to the Node.js sidecar backend.
/// The sidecar processes the message and sends a response back via events.
#[tauri::command]
pub async fn relay_message(
    app: AppHandle,
    name: String,
    args: serde_json::Value,
) -> Result<(), String> {
    sidecar::send_message(&app, &name, args)
        .await
        .map_err(|e| e.to_string())
}
