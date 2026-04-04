//! Manages the Node.js sidecar process that runs the loot-core backend.
//!
//! Communication uses newline-delimited JSON over stdin/stdout:
//! - Tauri → sidecar: writes JSON messages to sidecar's stdin
//! - Sidecar → Tauri: reads JSON messages from sidecar's stdout
//! - Tauri relays messages to/from the frontend via Tauri events

use std::io::Write;
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;

use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};

/// State managed by Tauri for the backend sidecar process.
pub struct SidecarState {
    child: Option<Child>,
    stdin: Option<ChildStdin>,
}

impl SidecarState {
    pub fn new() -> Self {
        Self {
            child: None,
            stdin: None,
        }
    }
}

/// Find the loot-core server bundle path.
fn find_server_bundle() -> Option<PathBuf> {
    let exe_dir = std::env::current_exe().ok()?;
    let exe_parent = exe_dir.parent()?;

    // Paths relative to the binary location
    let candidates = vec![
        // Dev: binary is at src-tauri/target/debug/actual-desktop
        // Bundle is at packages/loot-core/lib-dist/electron/bundle.desktop.js
        exe_parent.join("../../../loot-core/lib-dist/electron/bundle.desktop.js"),
        exe_parent.join("../../../../packages/loot-core/lib-dist/electron/bundle.desktop.js"),
        // Production: binary is at the app root
        exe_parent.join("resources/loot-core/lib-dist/electron/bundle.desktop.js"),
        exe_parent.join("../Resources/loot-core/lib-dist/electron/bundle.desktop.js"),
    ];

    // Also try paths relative to current working directory
    let cwd_candidates = vec![
        PathBuf::from("../../loot-core/lib-dist/electron/bundle.desktop.js"),
        PathBuf::from("../../../packages/loot-core/lib-dist/electron/bundle.desktop.js"),
        PathBuf::from("packages/loot-core/lib-dist/electron/bundle.desktop.js"),
    ];

    for path in candidates.iter().chain(cwd_candidates.iter()) {
        if path.exists() {
            return Some(path.canonicalize().unwrap_or_else(|_| path.clone()));
        }
    }

    None
}

/// Find the sidecar server.js entry point.
fn find_sidecar_entry() -> Option<PathBuf> {
    let exe_dir = std::env::current_exe().ok()?;
    let exe_parent = exe_dir.parent()?;

    // Paths relative to the binary location
    let candidates = vec![
        // Dev: binary at src-tauri/target/debug/actual-desktop
        // Sidecar at packages/desktop-tauri/sidecar/server.js
        exe_parent.join("../../../sidecar/server.js"),
        exe_parent.join("../../../../packages/desktop-tauri/sidecar/server.js"),
        // Production
        exe_parent.join("resources/sidecar/server.js"),
        exe_parent.join("../Resources/sidecar/server.js"),
    ];

    // Also try paths relative to current working directory
    let cwd_candidates = vec![
        PathBuf::from("sidecar/server.js"),
        PathBuf::from("../sidecar/server.js"),
        PathBuf::from("../../desktop-tauri/sidecar/server.js"),
        PathBuf::from("packages/desktop-tauri/sidecar/server.js"),
    ];

    for path in candidates.iter().chain(cwd_candidates.iter()) {
        if path.exists() {
            return Some(path.canonicalize().unwrap_or_else(|_| path.clone()));
        }
    }

    None
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

fn get_document_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("ACTUAL_DOCUMENT_DIR") {
        PathBuf::from(dir)
    } else {
        dirs::document_dir().unwrap_or_else(|| PathBuf::from("."))
    }
}

/// Start the Node.js backend sidecar process.
pub async fn start_backend(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let sidecar_entry = find_sidecar_entry()
        .ok_or("Could not find sidecar server.js entry point")?;

    let server_bundle = find_server_bundle();

    let data_dir = get_data_dir(app);
    let document_dir = get_document_dir();

    let version = app
        .config()
        .version
        .clone()
        .unwrap_or_else(|| "0.0.0".to_string());
    let is_dev = cfg!(debug_assertions);

    // Ensure data directory exists
    let _ = std::fs::create_dir_all(&data_dir);

    let mut cmd = Command::new("node");
    cmd.arg(&sidecar_entry)
        .arg("--subprocess")
        .arg(&version)
        .env("ACTUAL_DATA_DIR", &data_dir)
        .env("ACTUAL_DOCUMENT_DIR", &document_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(bundle_path) = server_bundle {
        cmd.env("lootCoreScript", bundle_path.to_string_lossy().to_string());
    }

    if is_dev {
        cmd.env("NODE_ENV", "development");
    }

    // Read self-signed cert config from global prefs
    let prefs_path = data_dir.join("global-store.json");
    if let Ok(contents) = std::fs::read_to_string(&prefs_path) {
        if let Ok(prefs) = serde_json::from_str::<Value>(&contents) {
            if let Some(cert) = prefs.get("serverSelfSignedCert").and_then(|c| c.as_str()) {
                cmd.env("NODE_EXTRA_CA_CERTS", cert);
            }
        }
    }

    let mut child = cmd.spawn()?;

    let stdin = child.stdin.take();
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    // Store process handle
    {
        let state = app.state::<Mutex<SidecarState>>();
        let mut state = state.lock().map_err(|e| e.to_string())?;
        state.stdin = stdin;
        state.child = Some(child);
    }

    // Spawn task to read stdout and relay messages to frontend
    if let Some(stdout) = stdout {
        let app_handle = app.clone();
        std::thread::spawn(move || {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        if line.trim().is_empty() {
                            continue;
                        }
                        match serde_json::from_str::<Value>(&line) {
                            Ok(msg) => {
                                // Relay message to frontend
                                let _ = app_handle.emit("message", &msg);
                            }
                            Err(_) => {
                                // Not JSON - treat as log output
                                log::info!("[sidecar stdout] {}", line);
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("Error reading sidecar stdout: {}", e);
                        break;
                    }
                }
            }
            log::info!("Sidecar stdout reader exiting");
        });
    }

    // Spawn task to read stderr and log it
    if let Some(stderr) = stderr {
        std::thread::spawn(move || {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stderr);
            for line in reader.lines() {
                match line {
                    Ok(line) => log::warn!("[sidecar stderr] {}", line),
                    Err(e) => {
                        log::error!("Error reading sidecar stderr: {}", e);
                        break;
                    }
                }
            }
        });
    }

    Ok(())
}

/// Stop the backend sidecar process.
pub async fn stop_backend(app: &AppHandle) {
    let mut child_to_kill = None;
    let state = app.state::<Mutex<SidecarState>>();
    {
        if let Ok(mut guard) = state.lock() {
            guard.stdin = None;
            child_to_kill = guard.child.take();
        }
    }
    if let Some(mut child) = child_to_kill {
        let _ = child.kill();
        let _ = child.wait();
    }
}

/// Send a message to the sidecar process via stdin.
pub async fn send_message(
    app: &AppHandle,
    name: &str,
    args: Value,
) -> Result<(), Box<dyn std::error::Error>> {
    let msg = serde_json::json!({
        "name": name,
        "args": args
    });

    let state = app.state::<Mutex<SidecarState>>();
    let mut state = state.lock().map_err(|e| e.to_string())?;

    if let Some(ref mut stdin) = state.stdin {
        let mut serialized = serde_json::to_string(&msg)?;
        serialized.push('\n');
        stdin.write_all(serialized.as_bytes())?;
        stdin.flush()?;
        Ok(())
    } else {
        Err("Sidecar not running".into())
    }
}
