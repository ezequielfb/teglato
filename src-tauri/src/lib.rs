mod input_hook;
mod obs_server;
mod store;
mod tray;

use crate::store::{load_config, save_config, AppConfig, WindowPosition};
use crate::tray::{setup_tray, sync_tray_state, TrayHandles};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tokio::sync::{broadcast, oneshot};

const BASE_WINDOW_WIDTH: f64 = 360.0;
const BASE_WINDOW_HEIGHT: f64 = 270.0;

pub struct SharedState {
    pub config: Mutex<AppConfig>,
    pub obs_tx: broadcast::Sender<String>,
    pub obs_shutdown: Mutex<Option<oneshot::Sender<()>>>,
    pub tray_handles: Mutex<Option<TrayHandles>>,
}

#[tauri::command]
fn get_config(state: tauri::State<'_, SharedState>) -> AppConfig {
    state
        .config
        .lock()
        .map(|c| c.clone())
        .unwrap_or_default()
}

#[tauri::command]
fn update_config(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    config: AppConfig,
) -> AppConfig {
    let next = config.sanitized();
    let prev_port = state
        .config
        .lock()
        .map(|c| c.obs_port)
        .unwrap_or(3777);

    if let Ok(mut guard) = state.config.lock() {
        *guard = next.clone();
    }

    let port_changed = next.obs_port != prev_port;
    apply_overlay_config(&app, &next, port_changed);
    next
}

#[tauri::command]
fn save_window_position(app: AppHandle, state: tauri::State<'_, SharedState>) {
    let Some(overlay) = app.get_webview_window("overlay") else {
        return;
    };
    let Ok(pos) = overlay.outer_position() else {
        return;
    };
    if let Ok(mut cfg) = state.config.lock() {
        cfg.position = Some(WindowPosition { x: pos.x, y: pos.y });
        save_config(&app, &cfg);
    }
}

#[tauri::command]
fn reset_position(app: AppHandle) {
    reset_overlay_position(&app);
}

#[tauri::command]
fn copy_obs_url(app: AppHandle) -> Result<String, String> {
    copy_obs_url_to_clipboard(&app)
}

#[tauri::command]
fn open_settings(app: AppHandle) {
    toggle_settings_window(&app);
}

pub fn copy_obs_url_to_clipboard(app: &AppHandle) -> Result<String, String> {
    let port = app
        .try_state::<SharedState>()
        .and_then(|s| s.config.lock().ok().map(|c| c.obs_port))
        .unwrap_or(3777);
    let url = format!("http://127.0.0.1:{}/?obs=1", port);
    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(url.clone()).map_err(|e| e.to_string())?;
    Ok(url)
}

pub fn reset_overlay_position(app: &AppHandle) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        let _ = overlay.center();
        if let Ok(pos) = overlay.outer_position() {
            if let Some(state) = app.try_state::<SharedState>() {
                if let Ok(mut cfg) = state.config.lock() {
                    cfg.position = Some(WindowPosition { x: pos.x, y: pos.y });
                    save_config(app, &cfg);
                }
            }
        }
    }
}

pub fn apply_overlay_config(app: &AppHandle, config: &AppConfig, restart_obs_server: bool) {
    save_config(app, config);

    if let Some(overlay) = app.get_webview_window("overlay") {
        let target_w = (BASE_WINDOW_WIDTH * config.scale).round();
        let target_h = (BASE_WINDOW_HEIGHT * config.scale).round();
        let _ = overlay.set_size(LogicalSize::new(target_w, target_h));
        let _ = overlay.set_always_on_top(config.always_on_top);
        if config.locked {
            let _ = overlay.set_ignore_cursor_events(true);
        }
        let _ = overlay.emit("config-updated", config);
    }

    if let Some(settings) = app.get_webview_window("settings") {
        let _ = settings.emit("config-updated", config);
    }

    // Atualiza autostart nativo no sistema operacional
    let autostart = app.autolaunch();
    if config.autostart {
        let _ = autostart.enable();
    } else {
        let _ = autostart.disable();
    }

    if let Some(state) = app.try_state::<SharedState>() {
        if let Ok(payload) = serde_json::to_string(&serde_json::json!({
            "kind": "config",
            "config": config,
        })) {
            let _ = state.obs_tx.send(payload);
        }

        if restart_obs_server {
            if let Ok(mut guard) = state.obs_shutdown.lock() {
                if let Some(old_tx) = guard.take() {
                    let _ = old_tx.send(());
                }
                let new_tx =
                    obs_server::spawn_obs_server(app.clone(), config.obs_port, state.obs_tx.clone());
                *guard = Some(new_tx);
            }
        }
    }

    sync_tray_state(app, config);
}

pub fn toggle_settings_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
        }
        return;
    }

    if let Ok(win) = WebviewWindowBuilder::new(
        app,
        "settings",
        WebviewUrl::App("settings.html".into()),
    )
    .title("Teglato — Configurações")
    .inner_size(520.0, 640.0)
    .min_inner_size(460.0, 520.0)
    .resizable(true)
    .center()
    .build()
    {
        let _ = win.set_focus();
    }
}

fn register_global_shortcuts(app: &AppHandle) {
    let open_settings_shortcut = Shortcut::new(
        Some(Modifiers::CONTROL | Modifiers::SHIFT),
        Code::Comma,
    );
    let toggle_lock_shortcut = Shortcut::new(
        Some(Modifiers::CONTROL | Modifiers::SHIFT),
        Code::KeyL,
    );

    if let Err(err) = app.global_shortcut().on_shortcut(
        open_settings_shortcut,
        |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                toggle_settings_window(app);
            }
        },
    ) {
        eprintln!("Aviso: atalho Ctrl+Shift+, indisponível: {}", err);
    }

    if let Err(err) = app.global_shortcut().on_shortcut(
        toggle_lock_shortcut,
        |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Some(state) = app.try_state::<SharedState>() {
                    if let Ok(mut cfg) = state.config.lock() {
                        cfg.locked = !cfg.locked;
                        let snapshot = cfg.clone();
                        drop(cfg);
                        apply_overlay_config(app, &snapshot, false);
                    }
                }
            }
        },
    ) {
        eprintln!("Aviso: atalho Ctrl+Shift+L indisponível: {}", err);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (obs_tx, _) = broadcast::channel::<String>(256);

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(SharedState {
            config: Mutex::new(AppConfig::default()),
            obs_tx,
            obs_shutdown: Mutex::new(None),
            tray_handles: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            update_config,
            save_window_position,
            reset_position,
            copy_obs_url,
            open_settings,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let config = load_config(&handle);

            if let Some(state) = handle.try_state::<SharedState>() {
                if let Ok(mut cfg_guard) = state.config.lock() {
                    *cfg_guard = config.clone();
                }

                let obs_shutdown_tx = obs_server::spawn_obs_server(
                    handle.clone(),
                    config.obs_port,
                    state.obs_tx.clone(),
                );
                if let Ok(mut guard) = state.obs_shutdown.lock() {
                    *guard = Some(obs_shutdown_tx);
                }

                if let Ok(handles) = setup_tray(&handle, &config) {
                    if let Ok(mut guard) = state.tray_handles.lock() {
                        *guard = Some(handles);
                    }
                }
            }

            if let Some(overlay) = handle.get_webview_window("overlay") {
                if let Some(pos) = &config.position {
                    let _ = overlay.set_position(PhysicalPosition::new(pos.x, pos.y));
                }
                apply_overlay_config(&handle, &config, false);
            }

            register_global_shortcuts(&handle);
            input_hook::start_global_hook(handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao executar Teglato");
}
