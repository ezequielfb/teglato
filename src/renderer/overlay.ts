import {
  DEFAULT_CONFIG,
  type AppConfig,
  type InputEvent,
  type WsMessage,
} from '../shared/types.ts';
import { getKeyDisplayLabel } from '../shared/keyMap.ts';
import { SoundEngine } from './audio/soundEngine.ts';
import { CatRenderer, getInteractiveHitBounds } from './rig/catRenderer.ts';
import {
  KEY_POLYGONS,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  renderDesk,
} from './rig/deskRenderer.ts';
import { FloatingKeyParticles, SleepParticles } from './rig/particles.ts';
import { CatStateMachine } from './state.ts';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const rawCtx = canvas.getContext('2d', { alpha: true });

if (!rawCtx) {
  throw new Error('Contexto 2D do Canvas indisponível.');
}

const ctx: CanvasRenderingContext2D = rawCtx;

const params = new URLSearchParams(window.location.search);
const isObsMode = params.get('obs') === '1';
const isTauriRuntime = typeof window.__TAURI_INTERNALS__ !== 'undefined' && !isObsMode;

let currentConfig: AppConfig = { ...DEFAULT_CONFIG };
const state = new CatStateMachine();
const catRenderer = new CatRenderer();
const floatingKeys = new FloatingKeyParticles();
const sleepParticles = new SleepParticles();
const soundEngine = new SoundEngine();

function applyBackgroundMode(config: AppConfig): void {
  if (config.chromaMode === 'green') {
    document.documentElement.style.background = '#00ff00';
    document.body.style.background = '#00ff00';
  } else if (config.chromaMode === 'magenta') {
    document.documentElement.style.background = '#ff00ff';
    document.body.style.background = '#ff00ff';
  } else {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }
}

function handleIncomingInput(event: InputEvent): void {
  const effect = state.applyInput(event, currentConfig);

  if (
    event.type === 'key_down' &&
    effect.triggeredKey &&
    currentConfig.showFloatingKeys
  ) {
    const poly = KEY_POLYGONS.get(effect.triggeredKey);
    if (poly) {
      floatingKeys.spawn(poly.cx, poly.cy, getKeyDisplayLabel(event.code));
    }
  }

  // No OBS Browser Source, evitamos áudio duplicado para não somar com o desktop.
  if (isObsMode) {
    return;
  }
  if (effect.triggeredKey) {
    soundEngine.playKeyTap(currentConfig.audio);
  }
  if (effect.triggeredMouseClick) {
    soundEngine.playMouseClick(currentConfig.audio);
  }
}

function updateCanvasResolution(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetWidth = Math.max(1, Math.round(window.innerWidth * dpr));
  const targetHeight = Math.max(1, Math.round(window.innerHeight * dpr));
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
}

async function initTauriBridge(): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  const { listen } = await import('@tauri-apps/api/event');
  const { getCurrentWindow } = await import('@tauri-apps/api/window');

  try {
    currentConfig = await invoke<AppConfig>('get_config');
    applyBackgroundMode(currentConfig);
  } catch (err) {
    console.warn('Falha ao carregar configuração inicial:', err);
  }

  await listen<InputEvent>('input-event', (ev) => {
    handleIncomingInput(ev.payload);
  });

  await listen<AppConfig>('config-updated', (ev) => {
    currentConfig = ev.payload;
    applyBackgroundMode(currentConfig);
  });

  const appWindow = getCurrentWindow();
  const bounds = getInteractiveHitBounds();

  // Permite arrastar o gato livremente apenas quando destravado e clicando na silhueta visível
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || currentConfig.locked) {
      return;
    }
    const nx = ev.clientX / Math.max(1, window.innerWidth);
    const ny = ev.clientY / Math.max(1, window.innerHeight);
    const insideCatOrDesk =
      nx >= bounds.minX && nx <= bounds.maxX && ny >= bounds.minY && ny <= bounds.maxY;

    if (!insideCatOrDesk) {
      return;
    }

    void appWindow
      .startDragging()
      .then(() => {
        // Após soltar o arraste, salva a nova posição na área de trabalho
        setTimeout(() => {
          void invoke('save_window_position').catch(() => {});
        }, 120);
      })
      .catch(() => {});
  });
}

function initObsWebSocket(): void {
  let retryDelayMs = 500;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  const connect = () => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      retryDelayMs = 500;
    };
    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(String(msg.data)) as WsMessage;
        if (parsed.kind === 'input') {
          handleIncomingInput(parsed.event);
        } else if (parsed.kind === 'config') {
          currentConfig = parsed.config;
          applyBackgroundMode(currentConfig);
        }
      } catch {
        // Ignora pacotes inválidos silenciosamente
      }
    };
    ws.onclose = () => {
      setTimeout(connect, retryDelayMs);
      retryDelayMs = Math.min(5000, retryDelayMs * 1.5);
    };
    ws.onerror = () => {
      ws.close();
    };
  };

  connect();
}

function initBrowserPreviewInput(): void {
  // Permite testar o gato diretamente no navegador durante `npm run dev`
  window.addEventListener('keydown', (ev) => {
    handleIncomingInput({ type: 'key_down', code: ev.code });
  });
  window.addEventListener('keyup', (ev) => {
    handleIncomingInput({ type: 'key_up', code: ev.code });
  });
  window.addEventListener('mousemove', (ev) => {
    handleIncomingInput({
      type: 'mouse_move',
      x: ev.clientX / Math.max(1, window.innerWidth),
      y: ev.clientY / Math.max(1, window.innerHeight),
    });
  });
  window.addEventListener('mousedown', (ev) => {
    const button = ev.button === 2 ? 'right' : ev.button === 1 ? 'middle' : 'left';
    handleIncomingInput({ type: 'mouse_down', button });
  });
  window.addEventListener('mouseup', (ev) => {
    const button = ev.button === 2 ? 'right' : ev.button === 1 ? 'middle' : 'left';
    handleIncomingInput({ type: 'mouse_up', button });
  });
}

let lastFrameTime = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
  lastFrameTime = now;

  updateCanvasResolution();
  state.tick(dt, currentConfig);

  if (!isObsMode) {
    soundEngine.updatePurr(state.isSleeping && state.sleepBlend > 0.7, currentConfig.audio);
  }

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Escala proporcional mantendo o aspect ratio 4:3 centralizado
  const scale = Math.min(canvas.width / LOGICAL_WIDTH, canvas.height / LOGICAL_HEIGHT);
  const offsetX = (canvas.width - LOGICAL_WIDTH * scale) * 0.5;
  const offsetY = (canvas.height - LOGICAL_HEIGHT * scale) * 0.5;

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.globalAlpha = isObsMode ? 1 : currentConfig.opacity;

  // Ordem de camadas: cauda/corpo -> mesa/mouse/teclado -> cabeça/patas -> partículas Zzz
  catRenderer.renderBackAndBody(ctx, state, currentConfig.coat);
  const deskGeometry = renderDesk(ctx, state);
  catRenderer.updatePaws(dt, state, deskGeometry);
  catRenderer.renderHeadAndPaws(ctx, state, currentConfig.coat);

  floatingKeys.update(dt);
  floatingKeys.render(ctx);

  sleepParticles.update(dt, state.sleepBlend > 0.65, 294, 102);
  sleepParticles.render(ctx);

  ctx.restore();
  requestAnimationFrame(frame);
}

if (isObsMode) {
  initObsWebSocket();
} else if (isTauriRuntime) {
  void initTauriBridge();
} else {
  initBrowserPreviewInput();
}

applyBackgroundMode(currentConfig);
requestAnimationFrame(frame);
