use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

pub const VALID_COATS: &[&str] = &[
    "tuxedo",
    "orange-tabby",
    "brown-tabby",
    "calico",
    "siamese",
    "black",
    "white",
    "blue-gray",
    "gray-white",
    "orange-white",
    "tortoiseshell",
    "cream",
    "silver",
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioConfig {
    pub enabled: bool,
    pub key_volume: f64,
    pub mouse_volume: f64,
    pub purr_volume: f64,
}

impl Default for AudioConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            key_volume: 0.35,
            mouse_volume: 0.30,
            purr_volume: 0.20,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WindowPosition {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub coat: String,
    pub scale: f64,
    pub opacity: f64,
    pub always_on_top: bool,
    pub locked: bool,
    pub autostart: bool,
    pub sleep_timeout_sec: u64,
    pub obs_port: u16,
    pub chroma_mode: String,
    pub audio: AudioConfig,
    pub position: Option<WindowPosition>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            coat: "tuxedo".to_string(),
            scale: 1.0,
            opacity: 1.0,
            always_on_top: true,
            locked: false,
            autostart: false,
            sleep_timeout_sec: 60,
            obs_port: 3777,
            chroma_mode: "transparent".to_string(),
            audio: AudioConfig::default(),
            position: None,
        }
    }
}

impl AppConfig {
    /// Normaliza valores fora de faixa para evitar estados inválidos em runtime.
    pub fn sanitized(mut self) -> Self {
        if !VALID_COATS.contains(&self.coat.as_str()) {
            self.coat = "tuxedo".to_string();
        }
        self.scale = self.scale.clamp(0.5, 2.0);
        self.opacity = self.opacity.clamp(0.3, 1.0);
        self.sleep_timeout_sec = self.sleep_timeout_sec.clamp(15, 300);
        if self.obs_port < 1024 {
            self.obs_port = 3777;
        }
        if !matches!(
            self.chroma_mode.as_str(),
            "transparent" | "green" | "magenta"
        ) {
            self.chroma_mode = "transparent".to_string();
        }
        self.audio.key_volume = self.audio.key_volume.clamp(0.0, 1.0);
        self.audio.mouse_volume = self.audio.mouse_volume.clamp(0.0, 1.0);
        self.audio.purr_volume = self.audio.purr_volume.clamp(0.0, 1.0);
        self
    }
}

pub fn config_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join("config.json"))
}

pub fn load_config_from_path(path: &Path) -> AppConfig {
    match fs::read_to_string(path) {
        Ok(raw) => serde_json::from_str::<AppConfig>(&raw)
            .map(AppConfig::sanitized)
            .unwrap_or_default(),
        Err(_) => AppConfig::default(),
    }
}

pub fn save_config_to_path(path: &Path, config: &AppConfig) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub fn load_config(app: &tauri::AppHandle) -> AppConfig {
    config_path(app)
        .map(|p| load_config_from_path(&p))
        .unwrap_or_default()
}

pub fn save_config(app: &tauri::AppHandle, config: &AppConfig) {
    if let Some(path) = config_path(app) {
        let _ = save_config_to_path(&path, config);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_uses_tuxedo_and_expected_bounds() {
        let cfg = AppConfig::default();
        assert_eq!(cfg.coat, "tuxedo");
        assert_eq!(cfg.obs_port, 3777);
        assert!(!cfg.audio.enabled);
        assert!(cfg.always_on_top);
        assert!(!cfg.locked);
    }

    #[test]
    fn sanitized_clamps_invalid_values() {
        let cfg = AppConfig {
            coat: "nonexistent".into(),
            scale: 9.0,
            opacity: 0.05,
            sleep_timeout_sec: 2,
            obs_port: 80,
            chroma_mode: "blue".into(),
            ..Default::default()
        }
        .sanitized();

        assert_eq!(cfg.coat, "tuxedo");
        assert!((cfg.scale - 2.0).abs() < f64::EPSILON);
        assert!((cfg.opacity - 0.3).abs() < f64::EPSILON);
        assert_eq!(cfg.sleep_timeout_sec, 15);
        assert_eq!(cfg.obs_port, 3777);
        assert_eq!(cfg.chroma_mode, "transparent");
    }

    #[test]
    fn roundtrip_save_and_load_file() {
        let tmp = std::env::temp_dir().join("teglato_store_test.json");
        let _ = fs::remove_file(&tmp);

        let mut cfg = AppConfig::default();
        cfg.coat = "calico".into();
        cfg.scale = 1.4;
        cfg.position = Some(WindowPosition { x: 120, y: 240 });

        save_config_to_path(&tmp, &cfg).expect("save should succeed");
        let loaded = load_config_from_path(&tmp);
        assert_eq!(loaded, cfg);

        let _ = fs::remove_file(&tmp);
    }
}
