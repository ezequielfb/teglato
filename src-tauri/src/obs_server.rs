use crate::SharedState;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use rust_embed::RustEmbed;
use tauri::Manager;
use tokio::sync::{broadcast, oneshot};

/// Empacota o diretório `dist/` gerado pelo Vite diretamente dentro do executável
/// para que o OBS Browser Source funcione mesmo em versão portátil isolada.
#[derive(RustEmbed)]
#[folder = "../dist"]
struct DistAssets;

#[derive(Clone)]
struct ServerState {
    app: tauri::AppHandle,
    obs_tx: broadcast::Sender<String>,
}

/// Sobe o servidor HTTP + WebSocket local em `127.0.0.1:<port>` e retorna o sinalizador de desligamento.
pub fn spawn_obs_server(
    app: tauri::AppHandle,
    port: u16,
    obs_tx: broadcast::Sender<String>,
) -> oneshot::Sender<()> {
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    let state = ServerState { app, obs_tx };

    tauri::async_runtime::spawn(async move {
        let router = Router::new()
            .route("/", get(serve_index))
            .route("/overlay.html", get(serve_index))
            .route("/assets/*path", get(serve_asset))
            .route("/ws", get(ws_handler))
            .with_state(state);

        let addr = format!("127.0.0.1:{}", port);
        match tokio::net::TcpListener::bind(&addr).await {
            Ok(listener) => {
                let _ = axum::serve(listener, router)
                    .with_graceful_shutdown(async move {
                        let _ = shutdown_rx.await;
                    })
                    .await;
            }
            Err(err) => {
                eprintln!("Falha ao iniciar servidor OBS em {}: {}", addr, err);
            }
        }
    });

    shutdown_tx
}

async fn serve_index() -> Response {
    serve_embedded_path("overlay.html")
}

async fn serve_asset(Path(path): Path<String>) -> Response {
    let normalized = format!("assets/{}", path.trim_start_matches('/'));
    serve_embedded_path(&normalized)
}

fn serve_embedded_path(path: &str) -> Response {
    match DistAssets::get(path) {
        Some(file) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            (
                StatusCode::OK,
                [(header::CONTENT_TYPE, mime.as_ref().to_string())],
                file.data.into_owned(),
            )
                .into_response()
        }
        None => (StatusCode::NOT_FOUND, "Recurso não encontrado").into_response(),
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<ServerState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ws_client(socket, state))
}

async fn handle_ws_client(mut socket: WebSocket, state: ServerState) {
    // Clona o snapshot e solta o MutexGuard antes de qualquer `.await` para manter Future `Send`.
    let initial_snapshot = state
        .app
        .try_state::<SharedState>()
        .and_then(|shared| {
            let cfg = shared.config.lock().ok()?;
            serde_json::to_string(&serde_json::json!({
                "kind": "config",
                "config": *cfg,
            }))
            .ok()
        });

    if let Some(snapshot) = initial_snapshot {
        if socket.send(Message::Text(snapshot)).await.is_err() {
            return;
        }
    }

    let mut rx = state.obs_tx.subscribe();
    loop {
        match rx.recv().await {
            Ok(payload) => {
                if socket.send(Message::Text(payload)).await.is_err() {
                    break;
                }
            }
            Err(broadcast::error::RecvError::Lagged(_)) => continue,
            Err(broadcast::error::RecvError::Closed) => break,
        }
    }
}
