mod commands;
mod menu;
mod sidecar;
mod window_state;

use std::sync::Mutex;

use tauri::Manager;

pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .manage(Mutex::new(sidecar::SidecarState::new()))
        .manage(Mutex::new(commands::sync_server::SyncServerState::new()))
        .manage(Mutex::new(commands::oauth::OAuthServerState::new()))
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Restore window state
            if let Some(window) = app.get_webview_window("main") {
                window_state::restore_window_state(&app_handle, &window);
            }

            // Start the Node.js sidecar backend
            let sidecar_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = sidecar::start_backend(&sidecar_handle).await {
                    log::error!("Failed to start backend sidecar: {}", e);
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            window_state::handle_window_event(window, event);
        })
        .invoke_handler(tauri::generate_handler![
            commands::app::get_bootstrap_data,
            commands::app::relaunch,
            commands::app::set_theme,
            commands::dialog::open_file_dialog,
            commands::dialog::save_file_dialog,
            commands::shell::open_external_url,
            commands::shell::open_in_file_manager,
            commands::server::restart_server,
            commands::server::relay_message,
            commands::sync_server::start_sync_server,
            commands::sync_server::stop_sync_server,
            commands::sync_server::is_sync_server_running,
            commands::oauth::start_oauth_server,
            commands::filesystem::move_budget_directory,
        ])
        .menu(|handle| menu::create_menu(handle))
        .on_menu_event(menu::handle_menu_event)
        .run(tauri::generate_context!())
        .expect("error while running Actual");
}
