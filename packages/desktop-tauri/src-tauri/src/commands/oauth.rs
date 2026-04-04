use std::sync::Mutex;

use tauri::AppHandle;
use tauri::Manager;
use tokio::net::TcpListener;
use tokio::sync::oneshot;

pub struct OAuthServerState {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl OAuthServerState {
    pub fn new() -> Self {
        Self { shutdown_tx: None }
    }
}

#[tauri::command]
pub async fn start_oauth_server(app: AppHandle) -> Result<String, String> {
    let is_dev = cfg!(debug_assertions);

    let listener = TcpListener::bind("127.0.0.1:3010")
        .await
        .map_err(|e| format!("Failed to bind OAuth server: {}", e))?;

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    // Store shutdown sender
    {
        let state = app.state::<Mutex<OAuthServerState>>();
        let mut state = state.lock().map_err(|e| e.to_string())?;
        state.shutdown_tx = Some(shutdown_tx);
    }

    let app_handle = app.clone();

    tokio::spawn(async move {
        tokio::select! {
            result = listener.accept() => {
                if let Ok((stream, _)) = result {
                    handle_oauth_request(stream, &app_handle, is_dev).await;
                }
            }
            _ = shutdown_rx => {
                log::info!("OAuth server shutting down");
            }
        }
    });

    Ok("http://localhost:3010".to_string())
}

async fn handle_oauth_request(
    mut stream: tokio::net::TcpStream,
    _app: &AppHandle,
    is_dev: bool,
) {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let mut buf = [0u8; 4096];
    let n = match stream.read(&mut buf).await {
        Ok(n) => n,
        Err(_) => return,
    };

    let request = String::from_utf8_lossy(&buf[..n]);

    // Parse the token from the query string
    // Expected: GET /?token=<code> HTTP/1.1
    let token = request
        .lines()
        .next()
        .and_then(|line| line.split('?').nth(1))
        .and_then(|query| {
            query
                .split('&')
                .find(|p| p.starts_with("token="))
                .map(|p| p.trim_start_matches("token="))
                .map(|t| t.split_whitespace().next().unwrap_or(t))
                .map(String::from)
        });

    let redirect_url = if let Some(token) = token {
        if is_dev {
            format!("http://localhost:3001/openid-cb?token={}", token)
        } else {
            format!("tauri://localhost/openid-cb?token={}", token)
        }
    } else {
        if is_dev {
            "http://localhost:3001/openid-cb?error=no_token".to_string()
        } else {
            "tauri://localhost/openid-cb?error=no_token".to_string()
        }
    };

    let response = format!(
        "HTTP/1.1 302 Found\r\nLocation: {}\r\nContent-Length: 0\r\n\r\n",
        redirect_url
    );

    let _ = stream.write_all(response.as_bytes()).await;
}
