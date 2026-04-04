use serde::Deserialize;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenFileDialogOpts {
    #[serde(default)]
    pub properties: Option<Vec<String>>,
    #[serde(default)]
    pub filters: Option<Vec<FileFilter>>,
}

#[derive(Deserialize)]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[tauri::command]
pub async fn open_file_dialog(
    app: AppHandle,
    opts: Option<OpenFileDialogOpts>,
) -> Result<Option<Vec<String>>, String> {
    let opts = opts.unwrap_or_default();

    let mut builder = app.dialog().file();

    if let Some(filters) = &opts.filters {
        for filter in filters {
            let extensions: Vec<&str> = filter.extensions.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(&filter.name, &extensions);
        }
    }

    // Check if directory selection is requested
    if let Some(properties) = &opts.properties {
        if properties.contains(&"openDirectory".to_string()) {
            // Use blocking_pick_folder for directory selection
            let result = builder.blocking_pick_folder();
            return Ok(result.map(|path| vec![path.to_string()]));
        }
        if properties.contains(&"multiSelections".to_string()) {
            let result = builder.blocking_pick_files();
            return Ok(result.map(|paths| paths.iter().map(|p| p.to_string()).collect()));
        }
    }

    let result = builder.blocking_pick_file();
    Ok(result.map(|path| vec![path.to_string()]))
}

#[tauri::command]
pub async fn save_file_dialog(
    app: AppHandle,
    title: Option<String>,
    default_path: Option<String>,
    file_contents: Vec<u8>,
) -> Result<(), String> {
    let mut builder = app.dialog().file();

    if let Some(title) = title {
        builder = builder.set_title(title);
    }

    if let Some(default_path) = default_path {
        builder = builder.set_file_name(default_path);
    }

    let result = builder.blocking_save_file();

    match result {
        Some(path) => {
            let path_str = path.to_string();
            std::fs::write(&path_str, &file_contents).map_err(|e| e.to_string())?;
            Ok(())
        }
        None => Ok(()), // User cancelled
    }
}
