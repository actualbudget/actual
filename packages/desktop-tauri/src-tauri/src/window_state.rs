use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewWindow, Window, WindowEvent};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct WindowState {
    x: Option<i32>,
    y: Option<i32>,
    width: Option<u32>,
    height: Option<u32>,
    is_maximized: bool,
    is_full_screen: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: None,
            y: None,
            width: Some(1000),
            height: Some(700),
            is_maximized: false,
            is_full_screen: false,
        }
    }
}

fn get_state_file(app: &AppHandle) -> PathBuf {
    let data_dir = if let Ok(dir) = std::env::var("ACTUAL_DATA_DIR") {
        PathBuf::from(dir)
    } else {
        app.path()
            .app_data_dir()
            .unwrap_or_else(|_| dirs::data_dir().unwrap_or_default().join("Actual"))
    };
    data_dir.join("window.json")
}

fn load_state(app: &AppHandle) -> WindowState {
    let path = get_state_file(app);
    if let Ok(contents) = std::fs::read_to_string(&path) {
        serde_json::from_str(&contents).unwrap_or_default()
    } else {
        WindowState::default()
    }
}

fn save_state(app: &AppHandle, state: &WindowState) {
    let path = get_state_file(app);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(contents) = serde_json::to_string_pretty(state) {
        let _ = std::fs::write(&path, contents);
    }
}

pub fn restore_window_state(app: &AppHandle, window: &WebviewWindow) {
    let state = load_state(app);

    if let (Some(width), Some(height)) = (state.width, state.height) {
        let _ = window.set_size(PhysicalSize::new(width, height));
    }

    if let (Some(x), Some(y)) = (state.x, state.y) {
        let _ = window.set_position(PhysicalPosition::new(x, y));
    }

    if state.is_maximized {
        let _ = window.maximize();
    }

    if state.is_full_screen {
        let _ = window.set_fullscreen(true);
    }
}

pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    let app = window.app_handle();

    match event {
        WindowEvent::Moved(position) => {
            let mut state = load_state(app);
            if !state.is_maximized && !state.is_full_screen {
                state.x = Some(position.x);
                state.y = Some(position.y);
                save_state(app, &state);
            }
        }
        WindowEvent::Resized(size) => {
            let mut state = load_state(app);
            let is_maximized = window.is_maximized().unwrap_or(false);
            let is_fullscreen = window.is_fullscreen().unwrap_or(false);
            state.is_maximized = is_maximized;
            state.is_full_screen = is_fullscreen;
            if !is_maximized && !is_fullscreen && size.width > 0 && size.height > 0 {
                state.width = Some(size.width);
                state.height = Some(size.height);
            }
            save_state(app, &state);
        }
        WindowEvent::CloseRequested { .. } => {
            let mut state = load_state(app);
            state.is_maximized = window.is_maximized().unwrap_or(false);
            state.is_full_screen = window.is_fullscreen().unwrap_or(false);
            if let Ok(pos) = window.outer_position() {
                if !state.is_maximized && !state.is_full_screen {
                    state.x = Some(pos.x);
                    state.y = Some(pos.y);
                }
            }
            if let Ok(size) = window.outer_size() {
                if !state.is_maximized && !state.is_full_screen {
                    state.width = Some(size.width);
                    state.height = Some(size.height);
                }
            }
            save_state(app, &state);
        }
        _ => {}
    }
}
