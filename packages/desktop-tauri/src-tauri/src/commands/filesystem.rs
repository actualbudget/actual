use std::path::Path;
use std::time::Duration;

#[tauri::command]
pub async fn move_budget_directory(from: String, to: String) -> Result<(), String> {
    let from_path = Path::new(&from);
    let to_path = Path::new(&to);

    if !from_path.exists() {
        return Err(format!("Source directory does not exist: {}", from));
    }

    // Copy with retries
    copy_directory_with_retry(from_path, to_path, 5).await?;

    // Remove old directory with retries
    remove_directory_with_retry(from_path, 5).await?;

    Ok(())
}

async fn copy_directory_with_retry(from: &Path, to: &Path, max_retries: u32) -> Result<(), String> {
    let mut last_error = String::new();

    for attempt in 0..max_retries {
        match copy_directory_recursive(from, to) {
            Ok(()) => return Ok(()),
            Err(e) => {
                last_error = e.to_string();
                if attempt < max_retries - 1 {
                    let delay = Duration::from_millis(200 + (attempt as u64 * 100));
                    tokio::time::sleep(delay).await;
                }
            }
        }
    }

    Err(format!(
        "Failed to copy directory after {} retries: {}",
        max_retries, last_error
    ))
}

fn copy_directory_recursive(from: &Path, to: &Path) -> Result<(), std::io::Error> {
    std::fs::create_dir_all(to)?;

    for entry in std::fs::read_dir(from)? {
        let entry = entry?;
        let from_path = entry.path();
        let to_path = to.join(entry.file_name());

        if from_path.is_dir() {
            copy_directory_recursive(&from_path, &to_path)?;
        } else {
            std::fs::copy(&from_path, &to_path)?;
        }
    }

    Ok(())
}

async fn remove_directory_with_retry(path: &Path, max_retries: u32) -> Result<(), String> {
    let mut last_error = String::new();

    for attempt in 0..max_retries {
        match std::fs::remove_dir_all(path) {
            Ok(()) => return Ok(()),
            Err(e) => {
                last_error = e.to_string();
                if attempt < max_retries - 1 {
                    let delay = Duration::from_millis(200 + (attempt as u64 * 100));
                    tokio::time::sleep(delay).await;
                }
            }
        }
    }

    Err(format!(
        "Failed to remove directory after {} retries: {}",
        max_retries, last_error
    ))
}
