use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;

use serde_json::Value;
use tauri::AppHandle;
use tauri::Manager;
use tokio::process::{Child, Command};

pub struct SyncServerState {
    process: Option<Child>,
}

impl SyncServerState {
    pub fn new() -> Self {
        Self { process: None }
    }
}

fn get_data_dir(app: &AppHandle) -> PathBuf {
    if let Ok(dir) = std::env::var("ACTUAL_DATA_DIR") {
        PathBuf::from(dir)
    } else {
        app.path()
            .app_data_dir()
            .unwrap_or_else(|_| dirs::data_dir().unwrap_or_default().join("Actual"))
    }
}

fn get_global_prefs(data_dir: &PathBuf) -> Value {
    let prefs_path = data_dir.join("global-store.json");
    if let Ok(contents) = std::fs::read_to_string(&prefs_path) {
        serde_json::from_str(&contents).unwrap_or_default()
    } else {
        Value::default()
    }
}

#[tauri::command]
pub async fn start_sync_server(app: AppHandle) -> Result<(), String> {
    // Check if already running
    {
        let state = app.state::<Mutex<SyncServerState>>();
        let guard = state.lock().map_err(|e| e.to_string())?;
        if guard.process.is_some() {
            return Ok(());
        }
    }

    let data_dir = get_data_dir(&app);
    let prefs = get_global_prefs(&data_dir);

    let port = prefs
        .get("syncServerConfig")
        .and_then(|c| c.get("port"))
        .and_then(|p| p.as_u64())
        .unwrap_or(5007);
    let hostname = prefs
        .get("syncServerConfig")
        .and_then(|c| c.get("hostname"))
        .and_then(|h| h.as_str())
        .unwrap_or("localhost")
        .to_string();

    let server_files = data_dir.join("actual-server").join("server-files");
    let user_files = data_dir.join("actual-server").join("user-files");
    let server_data = data_dir.join("actual-server").join("data");

    // Ensure directories exist
    let _ = std::fs::create_dir_all(&server_files);
    let _ = std::fs::create_dir_all(&user_files);
    let _ = std::fs::create_dir_all(&server_data);

    // Find the sync-server entry point
    let sync_server_path = find_sync_server_path()
        .ok_or_else(|| "Could not find sync-server package".to_string())?;

    let child = Command::new("node")
        .arg(&sync_server_path)
        .env("ACTUAL_PORT", port.to_string())
        .env("ACTUAL_HOSTNAME", &hostname)
        .env("ACTUAL_SERVER_FILES", &server_files)
        .env("ACTUAL_USER_FILES", &user_files)
        .env("ACTUAL_DATA_DIR", &server_data)
        .env("NODE_ENV", "production")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start sync server: {}", e))?;

    // Store the child process
    {
        let state = app.state::<Mutex<SyncServerState>>();
        let mut guard = state.lock().map_err(|e| e.to_string())?;
        guard.process = Some(child);
    }

    Ok(())
}

#[tauri::command]
pub async fn stop_sync_server(app: AppHandle) -> Result<(), String> {
    let child_to_kill = {
        let state = app.state::<Mutex<SyncServerState>>();
        let mut guard = state.lock().map_err(|e| e.to_string())?;
        guard.process.take()
    };

    if let Some(mut child) = child_to_kill {
        child.kill().await.map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn is_sync_server_running(app: AppHandle) -> Result<bool, String> {
    let state = app.state::<Mutex<SyncServerState>>();
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(state.process.is_some())
}

fn find_sync_server_path() -> Option<String> {
    // In development, look for the workspace package
    let possible_paths = vec![
        // Relative to the Tauri binary in development
        "../../sync-server/app.js",
        "../sync-server/app.js",
        // In packaged builds
        "../Resources/node_modules/@actual-app/sync-server/app.js",
        "./node_modules/@actual-app/sync-server/app.js",
    ];

    for path in possible_paths {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }

    None
}
