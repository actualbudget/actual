use tauri::menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager, Wry};

pub fn create_menu(handle: &AppHandle) -> Result<Menu<Wry>, tauri::Error> {
    let file_menu = SubmenuBuilder::new(handle, "File")
        .item(&MenuItemBuilder::with_id("quit", "Exit").build(handle)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(handle, "Edit")
        .item(&MenuItemBuilder::with_id("undo", "Undo").accelerator("CmdOrCtrl+Z").build(handle)?)
        .item(&MenuItemBuilder::with_id("redo", "Redo").accelerator("CmdOrCtrl+Shift+Z").build(handle)?)
        .separator()
        .item(&PredefinedMenuItem::cut(handle, None)?)
        .item(&PredefinedMenuItem::copy(handle, None)?)
        .item(&PredefinedMenuItem::paste(handle, None)?)
        .item(&PredefinedMenuItem::select_all(handle, None)?)
        .build()?;

    let view_menu = SubmenuBuilder::new(handle, "View")
        .item(&MenuItemBuilder::with_id("reload", "Reload").accelerator("CmdOrCtrl+R").build(handle)?)
        .item(&MenuItemBuilder::with_id("devtools", "Toggle Developer Tools").accelerator("CmdOrCtrl+Shift+I").build(handle)?)
        .separator()
        .item(&MenuItemBuilder::with_id("zoom-reset", "Actual Size").accelerator("CmdOrCtrl+0").build(handle)?)
        .item(&MenuItemBuilder::with_id("zoom-in", "Zoom In").accelerator("CmdOrCtrl+=").build(handle)?)
        .item(&MenuItemBuilder::with_id("zoom-out", "Zoom Out").accelerator("CmdOrCtrl+-").build(handle)?)
        .separator()
        .item(&MenuItemBuilder::with_id("fullscreen", "Toggle Full Screen").accelerator("F11").build(handle)?)
        .build()?;

    let window_menu = SubmenuBuilder::new(handle, "Window")
        .item(&PredefinedMenuItem::minimize(handle, None)?)
        .build()?;

    let menu = Menu::with_items(handle, &[&file_menu, &edit_menu, &view_menu, &window_menu])?;
    Ok(menu)
}

pub fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let window = match app.get_webview_window("main") {
        Some(w) => w,
        None => return,
    };

    match event.id().as_ref() {
        "quit" => {
            let _ = window.close();
        }
        "undo" => {
            let _ = window.eval(
                "if (window.__actionsForMenu) { window.__actionsForMenu.undo(); }",
            );
        }
        "redo" => {
            let _ = window.eval(
                "if (window.__actionsForMenu) { window.__actionsForMenu.redo(); }",
            );
        }
        "reload" => {
            let _ = window.eval("window.location.reload()");
        }
        "devtools" => {
            if window.is_devtools_open() {
                window.close_devtools();
            } else {
                window.open_devtools();
            }
        }
        "zoom-reset" => {
            let _ = app.emit("zoom-reset", ());
        }
        "zoom-in" => {
            let _ = app.emit("zoom-in", ());
        }
        "zoom-out" => {
            let _ = app.emit("zoom-out", ());
        }
        "fullscreen" => {
            if let Ok(is_full) = window.is_fullscreen() {
                let _ = window.set_fullscreen(!is_full);
            }
        }
        _ => {}
    }
}
