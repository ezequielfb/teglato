use crate::store::AppConfig;
use crate::{apply_overlay_config, copy_obs_url_to_clipboard, toggle_settings_window, SharedState};
use tauri::menu::{CheckMenuItem, CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Wry};

const COAT_LABELS: &[(&str, &str)] = &[
    ("tuxedo", "Tuxedo (Frajola)"),
    ("orange-tabby", "Orange tabby (Laranja)"),
    ("brown-tabby", "Brown tabby (Rajado)"),
    ("calico", "Calico (Tricolor)"),
    ("siamese", "Siamese (Siamês)"),
    ("black", "Black (Preto)"),
    ("white", "White (Branco)"),
    ("blue-gray", "Blue gray (Cinza azulado)"),
    ("gray-white", "Gray & white (Cinza e branco)"),
    ("orange-white", "Orange & white (Laranja e branco)"),
    ("tortoiseshell", "Tortoiseshell (Escaminha)"),
    ("cream", "Cream (Creme)"),
    ("silver", "Silver (Prateado)"),
];

pub struct TrayHandles {
    pub lock_item: CheckMenuItem<Wry>,
    pub audio_item: CheckMenuItem<Wry>,
    pub coat_items: Vec<(String, CheckMenuItem<Wry>)>,
}

pub fn setup_tray(app: &AppHandle, config: &AppConfig) -> tauri::Result<TrayHandles> {
    let open_settings = MenuItemBuilder::with_id("open_settings", "Abrir Configurações (Ctrl+Shift+,)")
        .build(app)?;

    let lock_item = CheckMenuItemBuilder::with_id("toggle_lock", "Travar Posição (Ctrl+Shift+L)")
        .checked(config.locked)
        .build(app)?;

    let audio_item = CheckMenuItemBuilder::with_id("toggle_audio", "Efeitos Sonoros")
        .checked(config.audio.enabled)
        .build(app)?;

    let mut coat_submenu_builder = SubmenuBuilder::new(app, "Pelagem");
    let mut coat_items = Vec::with_capacity(COAT_LABELS.len());

    for (id, label) in COAT_LABELS {
        let item = CheckMenuItemBuilder::with_id(format!("coat:{}", id), *label)
            .checked(config.coat == *id)
            .build(app)?;
        coat_submenu_builder = coat_submenu_builder.item(&item);
        coat_items.push(((*id).to_string(), item));
    }
    let coat_submenu = coat_submenu_builder.build()?;

    let copy_obs = MenuItemBuilder::with_id("copy_obs", "Copiar URL do OBS Studio").build(app)?;
    let reset_pos = MenuItemBuilder::with_id("reset_pos", "Resetar Posição").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Sair").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&open_settings)
        .separator()
        .item(&lock_item)
        .item(&coat_submenu)
        .item(&audio_item)
        .separator()
        .item(&copy_obs)
        .item(&reset_pos)
        .separator()
        .item(&quit)
        .build()?;

    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))?;

    TrayIconBuilder::with_id("teglato-tray")
        .icon(icon)
        .tooltip("Teglato — Clique para abrir configurações")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_settings_window(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| {
            handle_tray_menu_event(app, event.id().as_ref());
        })
        .build(app)?;

    Ok(TrayHandles {
        lock_item,
        audio_item,
        coat_items,
    })
}

pub fn sync_tray_state(app: &AppHandle, config: &AppConfig) {
    let Some(state) = app.try_state::<SharedState>() else {
        return;
    };
    let Ok(guard) = state.tray_handles.lock() else {
        return;
    };
    let Some(handles) = guard.as_ref() else {
        return;
    };

    let _ = handles.lock_item.set_checked(config.locked);
    let _ = handles.audio_item.set_checked(config.audio.enabled);
    for (id, item) in &handles.coat_items {
        let _ = item.set_checked(*id == config.coat);
    }
}

fn handle_tray_menu_event(app: &AppHandle, id: &str) {
    match id {
        "open_settings" => toggle_settings_window(app),
        "toggle_lock" => {
            if let Some(state) = app.try_state::<SharedState>() {
                if let Ok(mut cfg) = state.config.lock() {
                    cfg.locked = !cfg.locked;
                    let snapshot = cfg.clone();
                    drop(cfg);
                    apply_overlay_config(app, &snapshot, false);
                }
            }
        }
        "toggle_audio" => {
            if let Some(state) = app.try_state::<SharedState>() {
                if let Ok(mut cfg) = state.config.lock() {
                    cfg.audio.enabled = !cfg.audio.enabled;
                    let snapshot = cfg.clone();
                    drop(cfg);
                    apply_overlay_config(app, &snapshot, false);
                }
            }
        }
        "copy_obs" => {
            let _ = copy_obs_url_to_clipboard(app);
        }
        "reset_pos" => {
            crate::reset_overlay_position(app);
        }
        "quit" => {
            app.exit(0);
        }
        other if other.starts_with("coat:") => {
            let coat_id = other.trim_start_matches("coat:").to_string();
            if let Some(state) = app.try_state::<SharedState>() {
                if let Ok(mut cfg) = state.config.lock() {
                    cfg.coat = coat_id;
                    let snapshot = cfg.clone();
                    drop(cfg);
                    apply_overlay_config(app, &snapshot, false);
                }
            }
        }
        _ => {}
    }
}
