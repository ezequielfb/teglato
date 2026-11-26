use crate::SharedState;
use serde::Serialize;
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum InputEvent {
    KeyDown { code: String },
    KeyUp { code: String },
    MouseMove { x: f64, y: f64 },
    MouseDown { button: String },
    MouseUp { button: String },
}

/// Mapeia Virtual-Key codes do Windows para `KeyboardEvent.code` compatível com o `keyMap.ts`.
pub fn vk_to_dom_code(vk: u32, extended: bool) -> Option<&'static str> {
    match vk {
        // Letras A-Z
        0x41 => Some("KeyA"),
        0x42 => Some("KeyB"),
        0x43 => Some("KeyC"),
        0x44 => Some("KeyD"),
        0x45 => Some("KeyE"),
        0x46 => Some("KeyF"),
        0x47 => Some("KeyG"),
        0x48 => Some("KeyH"),
        0x49 => Some("KeyI"),
        0x4A => Some("KeyJ"),
        0x4B => Some("KeyK"),
        0x4C => Some("KeyL"),
        0x4D => Some("KeyM"),
        0x4E => Some("KeyN"),
        0x4F => Some("KeyO"),
        0x50 => Some("KeyP"),
        0x51 => Some("KeyQ"),
        0x52 => Some("KeyR"),
        0x53 => Some("KeyS"),
        0x54 => Some("KeyT"),
        0x55 => Some("KeyU"),
        0x56 => Some("KeyV"),
        0x57 => Some("KeyW"),
        0x58 => Some("KeyX"),
        0x59 => Some("KeyY"),
        0x5A => Some("KeyZ"),

        // Fileira numérica superior
        0x30 => Some("Digit0"),
        0x31 => Some("Digit1"),
        0x32 => Some("Digit2"),
        0x33 => Some("Digit3"),
        0x34 => Some("Digit4"),
        0x35 => Some("Digit5"),
        0x36 => Some("Digit6"),
        0x37 => Some("Digit7"),
        0x38 => Some("Digit8"),
        0x39 => Some("Digit9"),

        // Teclas de função F1-F12
        0x70 => Some("F1"),
        0x71 => Some("F2"),
        0x72 => Some("F3"),
        0x73 => Some("F4"),
        0x74 => Some("F5"),
        0x75 => Some("F6"),
        0x76 => Some("F7"),
        0x77 => Some("F8"),
        0x78 => Some("F9"),
        0x79 => Some("F10"),
        0x7A => Some("F11"),
        0x7B => Some("F12"),

        // Controle e edição
        0x08 => Some("Backspace"),
        0x09 => Some("Tab"),
        0x0D => Some(if extended { "NumpadEnter" } else { "Enter" }),
        0x14 => Some("CapsLock"),
        0x1B => Some("Escape"),
        0x20 => Some("Space"),

        // Modificadores esquerdo/direito
        0xA0 | 0x10 => Some("ShiftLeft"),
        0xA1 => Some("ShiftRight"),
        0xA2 | 0x11 => Some(if extended { "ControlRight" } else { "ControlLeft" }),
        0xA3 => Some("ControlRight"),
        0xA4 | 0x12 => Some(if extended { "AltRight" } else { "AltLeft" }),
        0xA5 => Some("AltRight"),
        0x5B => Some("MetaLeft"),
        0x5C => Some("MetaRight"),
        0x5D => Some("ContextMenu"),

        // Setas e navegação
        0x26 => Some("ArrowUp"),
        0x28 => Some("ArrowDown"),
        0x25 => Some("ArrowLeft"),
        0x27 => Some("ArrowRight"),
        0x2D => Some("Insert"),
        0x2E => Some("Delete"),
        0x24 => Some("Home"),
        0x23 => Some("End"),
        0x21 => Some("PageUp"),
        0x22 => Some("PageDown"),
        0x2C => Some("PrintScreen"),
        0x91 => Some("ScrollLock"),
        0x13 => Some("Pause"),

        // Pontuação OEM + ABNT2
        0xC0 => Some("Backquote"),
        0xBD => Some("Minus"),
        0xBB => Some("Equal"),
        0xDB => Some("BracketLeft"),
        0xDD => Some("BracketRight"),
        0xDC => Some("Backslash"),
        0xBA => Some("Semicolon"),
        0xDE => Some("Quote"),
        0xBC => Some("Comma"),
        0xBE => Some("Period"),
        0xBF => Some("Slash"),
        0xC1 => Some("IntlRo"),
        0xE2 => Some("IntlBackslash"),

        // Teclado numérico
        0x90 => Some("NumLock"),
        0x60 => Some("Numpad0"),
        0x61 => Some("Numpad1"),
        0x62 => Some("Numpad2"),
        0x63 => Some("Numpad3"),
        0x64 => Some("Numpad4"),
        0x65 => Some("Numpad5"),
        0x66 => Some("Numpad6"),
        0x67 => Some("Numpad7"),
        0x68 => Some("Numpad8"),
        0x69 => Some("Numpad9"),
        0x6A => Some("NumpadMultiply"),
        0x6B => Some("NumpadAdd"),
        0x6C => Some("NumpadComma"),
        0x6D => Some("NumpadSubtract"),
        0x6E => Some("NumpadDecimal"),
        0x6F => Some("NumpadDivide"),

        _ => None,
    }
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
enum RawHookEvent {
    Key { code: &'static str, pressed: bool },
    MouseMove { px: i32, py: i32, nx: f64, ny: f64 },
    MouseButton { button: &'static str, pressed: bool },
}

#[allow(dead_code)]
static HOOK_TX: OnceLock<tokio::sync::mpsc::UnboundedSender<RawHookEvent>> = OnceLock::new();

pub fn start_global_hook(app: tauri::AppHandle) {
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<RawHookEvent>();
    let _ = HOOK_TX.set(tx);

    // Despachante assíncrono: aplica throttling no mouse move e atualiza click-through dinâmico
    tauri::async_runtime::spawn(async move {
        let mut last_mouse_emit = Instant::now() - Duration::from_secs(1);
        let mut last_ignored_state: Option<bool> = None;

        while let Some(raw) = rx.recv().await {
            match raw {
                RawHookEvent::Key { code, pressed } => {
                    let ev = if pressed {
                        InputEvent::KeyDown {
                            code: code.to_string(),
                        }
                    } else {
                        InputEvent::KeyUp {
                            code: code.to_string(),
                        }
                    };
                    dispatch_input_event(&app, &ev);
                }
                RawHookEvent::MouseButton { button, pressed } => {
                    let ev = if pressed {
                        InputEvent::MouseDown {
                            button: button.to_string(),
                        }
                    } else {
                        InputEvent::MouseUp {
                            button: button.to_string(),
                        }
                    };
                    dispatch_input_event(&app, &ev);
                }
                RawHookEvent::MouseMove { px, py, nx, ny } => {
                    update_dynamic_click_through(&app, px, py, &mut last_ignored_state);

                    if last_mouse_emit.elapsed() >= Duration::from_millis(16) {
                        last_mouse_emit = Instant::now();
                        dispatch_input_event(&app, &InputEvent::MouseMove { x: nx, y: ny });
                    }
                }
            }
        }
    });

    #[cfg(windows)]
    std::thread::Builder::new()
        .name("teglato-win32-hook".to_string())
        .spawn(|| {
            win32::run_hook_loop();
        })
        .ok();
}

fn dispatch_input_event(app: &tauri::AppHandle, event: &InputEvent) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        let _ = overlay.emit("input-event", event);
    }

    if let Some(state) = app.try_state::<SharedState>() {
        if let Ok(payload) = serde_json::to_string(&serde_json::json!({
            "kind": "input",
            "event": event,
        })) {
            let _ = state.obs_tx.send(payload);
        }
    }
}

/// Ativa click-through automático nas áreas transparentes ao redor do gato quando destravado,
/// e força click-through total quando `config.locked == true`.
fn update_dynamic_click_through(
    app: &tauri::AppHandle,
    cursor_x: i32,
    cursor_y: i32,
    last_ignored_state: &mut Option<bool>,
) {
    let is_locked = app
        .try_state::<SharedState>()
        .and_then(|s| s.config.lock().ok().map(|c| c.locked))
        .unwrap_or(false);

    let Some(overlay) = app.get_webview_window("overlay") else {
        return;
    };

    let should_ignore = if is_locked {
        true
    } else if let (Ok(pos), Ok(size)) = (overlay.outer_position(), overlay.outer_size()) {
        let w = size.width.max(1) as f64;
        let h = size.height.max(1) as f64;
        let rel_x = (cursor_x - pos.x) as f64 / w;
        let rel_y = (cursor_y - pos.y) as f64 / h;

        // Sincronizado com `getInteractiveHitBounds()` em `catRenderer.ts`
        let inside_silhouette =
            (54.0 / 480.0..=426.0 / 480.0).contains(&rel_x)
                && (82.0 / 360.0..=336.0 / 360.0).contains(&rel_y);
        !inside_silhouette
    } else {
        false
    };

    if *last_ignored_state != Some(should_ignore) {
        if overlay.set_ignore_cursor_events(should_ignore).is_ok() {
            *last_ignored_state = Some(should_ignore);
        }
    }
}

#[cfg(windows)]
mod win32 {
    use super::{vk_to_dom_code, RawHookEvent, HOOK_TX};
    use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, DispatchMessageW, GetMessageW, GetSystemMetrics, SetWindowsHookExW,
        TranslateMessage, UnhookWindowsHookEx, KBDLLHOOKSTRUCT, LLKHF_EXTENDED, MSG,
        MSLLHOOKSTRUCT, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
        SM_YVIRTUALSCREEN, WH_KEYBOARD_LL, WH_MOUSE_LL, WM_KEYDOWN, WM_KEYUP, WM_LBUTTONDOWN,
        WM_LBUTTONUP, WM_MBUTTONDOWN, WM_MBUTTONUP, WM_MOUSEMOVE, WM_RBUTTONDOWN, WM_RBUTTONUP,
        WM_SYSKEYDOWN, WM_SYSKEYUP,
    };

    unsafe extern "system" fn keyboard_proc(
        code: i32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        if code >= 0 {
            let msg = wparam.0 as u32;
            let kb = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
            let extended = (kb.flags.0 & LLKHF_EXTENDED.0) != 0;

            if let Some(dom_code) = vk_to_dom_code(kb.vkCode, extended) {
                let pressed = matches!(msg, WM_KEYDOWN | WM_SYSKEYDOWN);
                let released = matches!(msg, WM_KEYUP | WM_SYSKEYUP);
                if pressed || released {
                    if let Some(tx) = HOOK_TX.get() {
                        let _ = tx.send(RawHookEvent::Key {
                            code: dom_code,
                            pressed,
                        });
                    }
                }
            }
        }
        CallNextHookEx(None, code, wparam, lparam)
    }

    unsafe extern "system" fn mouse_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 {
            let msg = wparam.0 as u32;
            let ms = &*(lparam.0 as *const MSLLHOOKSTRUCT);

            if let Some(tx) = HOOK_TX.get() {
                match msg {
                    WM_MOUSEMOVE => {
                        let vx = GetSystemMetrics(SM_XVIRTUALSCREEN);
                        let vy = GetSystemMetrics(SM_YVIRTUALSCREEN);
                        let vw = GetSystemMetrics(SM_CXVIRTUALSCREEN).max(1);
                        let vh = GetSystemMetrics(SM_CYVIRTUALSCREEN).max(1);

                        let nx = ((ms.pt.x - vx) as f64 / vw as f64).clamp(0.0, 1.0);
                        let ny = ((ms.pt.y - vy) as f64 / vh as f64).clamp(0.0, 1.0);
                        let _ = tx.send(RawHookEvent::MouseMove {
                            px: ms.pt.x,
                            py: ms.pt.y,
                            nx,
                            ny,
                        });
                    }
                    WM_LBUTTONDOWN => {
                        let _ = tx.send(RawHookEvent::MouseButton {
                            button: "left",
                            pressed: true,
                        });
                    }
                    WM_LBUTTONUP => {
                        let _ = tx.send(RawHookEvent::MouseButton {
                            button: "left",
                            pressed: false,
                        });
                    }
                    WM_RBUTTONDOWN => {
                        let _ = tx.send(RawHookEvent::MouseButton {
                            button: "right",
                            pressed: true,
                        });
                    }
                    WM_RBUTTONUP => {
                        let _ = tx.send(RawHookEvent::MouseButton {
                            button: "right",
                            pressed: false,
                        });
                    }
                    WM_MBUTTONDOWN => {
                        let _ = tx.send(RawHookEvent::MouseButton {
                            button: "middle",
                            pressed: true,
                        });
                    }
                    WM_MBUTTONUP => {
                        let _ = tx.send(RawHookEvent::MouseButton {
                            button: "middle",
                            pressed: false,
                        });
                    }
                    _ => {}
                }
            }
        }
        CallNextHookEx(None, code, wparam, lparam)
    }

    pub fn run_hook_loop() {
        unsafe {
            let kb_hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), None, 0).ok();
            let mouse_hook = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_proc), None, 0).ok();

            let mut msg = MSG::default();
            while GetMessageW(&mut msg, None, 0, 0).into() {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }

            if let Some(h) = kb_hook {
                let _ = UnhookWindowsHookEx(h);
            }
            if let Some(h) = mouse_hook {
                let _ = UnhookWindowsHookEx(h);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::vk_to_dom_code;

    #[test]
    fn maps_letters_digits_and_abnt2_keys() {
        assert_eq!(vk_to_dom_code(0x41, false), Some("KeyA"));
        assert_eq!(vk_to_dom_code(0x5A, false), Some("KeyZ"));
        assert_eq!(vk_to_dom_code(0x31, false), Some("Digit1"));
        assert_eq!(vk_to_dom_code(0x20, false), Some("Space"));
        assert_eq!(vk_to_dom_code(0x0D, false), Some("Enter"));
        assert_eq!(vk_to_dom_code(0x0D, true), Some("NumpadEnter"));
        assert_eq!(vk_to_dom_code(0xC1, false), Some("IntlRo"));
        assert_eq!(vk_to_dom_code(0xE2, false), Some("IntlBackslash"));
    }

    #[test]
    fn returns_none_for_unmapped_vk() {
        assert_eq!(vk_to_dom_code(0xFF, false), None);
    }
}
