import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ChromaMode,
  type CoatId,
} from '../shared/types.ts';
import { SoundEngine } from './audio/soundEngine.ts';
import { COATS } from './rig/coats.ts';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const isTauriRuntime = typeof window.__TAURI_INTERNALS__ !== 'undefined';
const soundEngine = new SoundEngine();
let currentConfig: AppConfig = structuredClone(DEFAULT_CONFIG);

const el = {
  coatGrid: document.getElementById('coat-grid') as HTMLDivElement,
  scale: document.getElementById('input-scale') as HTMLInputElement,
  valScale: document.getElementById('val-scale') as HTMLSpanElement,
  opacity: document.getElementById('input-opacity') as HTMLInputElement,
  valOpacity: document.getElementById('val-opacity') as HTMLSpanElement,
  alwaysOnTop: document.getElementById('chk-always-on-top') as HTMLInputElement,
  locked: document.getElementById('chk-locked') as HTMLInputElement,
  autostart: document.getElementById('chk-autostart') as HTMLInputElement,
  sleep: document.getElementById('input-sleep') as HTMLInputElement,
  valSleep: document.getElementById('val-sleep') as HTMLSpanElement,
  floatingKeys: document.getElementById('chk-floating-keys') as HTMLInputElement,
  audioEnabled: document.getElementById('chk-audio-enabled') as HTMLInputElement,
  audioControls: document.getElementById('audio-controls') as HTMLDivElement,
  keyVol: document.getElementById('input-key-vol') as HTMLInputElement,
  valKeyVol: document.getElementById('val-key-vol') as HTMLSpanElement,
  mouseVol: document.getElementById('input-mouse-vol') as HTMLInputElement,
  valMouseVol: document.getElementById('val-mouse-vol') as HTMLSpanElement,
  purrVol: document.getElementById('input-purr-vol') as HTMLInputElement,
  valPurrVol: document.getElementById('val-purr-vol') as HTMLSpanElement,
  btnTestSound: document.getElementById('btn-test-sound') as HTMLButtonElement,
  obsUrl: document.getElementById('input-obs-url') as HTMLInputElement,
  btnCopyObs: document.getElementById('btn-copy-obs') as HTMLButtonElement,
  obsPort: document.getElementById('input-obs-port') as HTMLInputElement,
  chroma: document.getElementById('select-chroma') as HTMLSelectElement,
  btnResetPos: document.getElementById('btn-reset-pos') as HTMLButtonElement,
};

function buildCoatGrid(): void {
  el.coatGrid.innerHTML = '';
  for (const coat of COATS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'coat-btn';
    btn.dataset.coat = coat.id;

    const swatch = document.createElement('span');
    swatch.className = 'coat-swatch';
    swatch.style.background = coat.baseColor;

    const accent = document.createElement('span');
    accent.className = 'coat-swatch-accent';
    accent.style.background =
      coat.pattern === 'solid' ? coat.innerEarColor : coat.secondaryColor;

    const eye = document.createElement('span');
    eye.className = 'coat-swatch-eye';
    eye.style.background = coat.eyeColor;

    swatch.append(accent, eye);

    const meta = document.createElement('span');
    meta.className = 'coat-meta';

    const name = document.createElement('span');
    name.className = 'coat-name';
    name.textContent = coat.label;

    const sub = document.createElement('span');
    sub.className = 'coat-sub';
    sub.textContent = coat.subtitle;

    meta.append(name, sub);
    btn.append(swatch, meta);

    btn.addEventListener('click', () => {
      void pushConfigUpdate({ ...currentConfig, coat: coat.id as CoatId });
    });

    el.coatGrid.appendChild(btn);
  }
}

function renderForm(config: AppConfig): void {
  currentConfig = config;

  for (const button of el.coatGrid.querySelectorAll<HTMLButtonElement>('.coat-btn')) {
    button.classList.toggle('active', button.dataset.coat === config.coat);
  }

  el.scale.value = String(config.scale);
  el.valScale.textContent = `${Math.round(config.scale * 100)}%`;

  el.opacity.value = String(config.opacity);
  el.valOpacity.textContent = `${Math.round(config.opacity * 100)}%`;

  el.alwaysOnTop.checked = config.alwaysOnTop;
  el.locked.checked = config.locked;
  el.autostart.checked = config.autostart;

  el.sleep.value = String(config.sleepTimeoutSec);
  el.valSleep.textContent = `${config.sleepTimeoutSec}s`;
  el.floatingKeys.checked = config.showFloatingKeys;

  el.audioEnabled.checked = config.audio.enabled;
  el.audioControls.classList.toggle('disabled', !config.audio.enabled);

  el.keyVol.value = String(config.audio.keyVolume);
  el.valKeyVol.textContent = `${Math.round(config.audio.keyVolume * 100)}%`;

  el.mouseVol.value = String(config.audio.mouseVolume);
  el.valMouseVol.textContent = `${Math.round(config.audio.mouseVolume * 100)}%`;

  el.purrVol.value = String(config.audio.purrVolume);
  el.valPurrVol.textContent = `${Math.round(config.audio.purrVolume * 100)}%`;

  el.obsPort.value = String(config.obsPort);
  el.obsUrl.value = `http://127.0.0.1:${config.obsPort}/?obs=1`;
  el.chroma.value = config.chromaMode;
}

async function pushConfigUpdate(next: AppConfig): Promise<void> {
  renderForm(next);
  if (!isTauriRuntime) {
    return;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  try {
    const saved = await invoke<AppConfig>('update_config', { config: next });
    renderForm(saved);
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
  }
}

function bindEvents(): void {
  el.scale.addEventListener('input', () => {
    void pushConfigUpdate({ ...currentConfig, scale: Number(el.scale.value) });
  });

  el.opacity.addEventListener('input', () => {
    void pushConfigUpdate({ ...currentConfig, opacity: Number(el.opacity.value) });
  });

  el.alwaysOnTop.addEventListener('change', () => {
    void pushConfigUpdate({ ...currentConfig, alwaysOnTop: el.alwaysOnTop.checked });
  });

  el.locked.addEventListener('change', () => {
    void pushConfigUpdate({ ...currentConfig, locked: el.locked.checked });
  });

  el.autostart.addEventListener('change', () => {
    void pushConfigUpdate({ ...currentConfig, autostart: el.autostart.checked });
  });

  el.sleep.addEventListener('input', () => {
    void pushConfigUpdate({ ...currentConfig, sleepTimeoutSec: Number(el.sleep.value) });
  });

  el.floatingKeys.addEventListener('change', () => {
    void pushConfigUpdate({ ...currentConfig, showFloatingKeys: el.floatingKeys.checked });
  });

  el.audioEnabled.addEventListener('change', () => {
    void pushConfigUpdate({
      ...currentConfig,
      audio: { ...currentConfig.audio, enabled: el.audioEnabled.checked },
    });
  });

  el.keyVol.addEventListener('input', () => {
    void pushConfigUpdate({
      ...currentConfig,
      audio: { ...currentConfig.audio, keyVolume: Number(el.keyVol.value) },
    });
  });

  el.mouseVol.addEventListener('input', () => {
    void pushConfigUpdate({
      ...currentConfig,
      audio: { ...currentConfig.audio, mouseVolume: Number(el.mouseVol.value) },
    });
  });

  el.purrVol.addEventListener('input', () => {
    void pushConfigUpdate({
      ...currentConfig,
      audio: { ...currentConfig.audio, purrVolume: Number(el.purrVol.value) },
    });
  });

  el.btnTestSound.addEventListener('click', () => {
    soundEngine.playKeyTap({ ...currentConfig.audio, enabled: true });
    setTimeout(() => {
      soundEngine.playMouseClick({ ...currentConfig.audio, enabled: true });
    }, 140);
  });

  el.obsPort.addEventListener('change', () => {
    const port = Math.min(65535, Math.max(1024, Math.round(Number(el.obsPort.value) || 3777)));
    void pushConfigUpdate({ ...currentConfig, obsPort: port });
  });

  el.chroma.addEventListener('change', () => {
    void pushConfigUpdate({
      ...currentConfig,
      chromaMode: el.chroma.value as ChromaMode,
    });
  });

  el.btnCopyObs.addEventListener('click', async () => {
    if (isTauriRuntime) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('copy_obs_url').catch(() => {});
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(el.obsUrl.value).catch(() => {});
    }
    const prevText = el.btnCopyObs.textContent;
    el.btnCopyObs.textContent = 'Copiado!';
    setTimeout(() => {
      el.btnCopyObs.textContent = prevText ?? 'Copiar URL';
    }, 1400);
  });

  el.btnResetPos.addEventListener('click', async () => {
    if (!isTauriRuntime) {
      renderForm(structuredClone(DEFAULT_CONFIG));
      return;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    const resetCfg = await invoke<AppConfig>('reset_all_config').catch(() => null);
    if (resetCfg) {
      renderForm(resetCfg);
    }
  });
}

async function init(): Promise<void> {
  buildCoatGrid();
  bindEvents();
  renderForm(currentConfig);

  if (!isTauriRuntime) {
    return;
  }

  const { invoke } = await import('@tauri-apps/api/core');
  const { listen } = await import('@tauri-apps/api/event');

  const config = await invoke<AppConfig>('get_config').catch(() => currentConfig);
  renderForm(config);

  await listen<AppConfig>('config-updated', (ev) => {
    renderForm(ev.payload);
  });
}

void init();
