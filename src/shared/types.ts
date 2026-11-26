/**
 * Tipos compartilhados entre o backend nativo (Rust/Tauri), o renderer do gato
 * (Overlay / OBS Browser Source) e a janela separada de configurações.
 */

/** Identificadores das 13 pelagens clássicas fiéis ao LittleOne. */
export type CoatId =
  | 'tuxedo'
  | 'orange-tabby'
  | 'brown-tabby'
  | 'calico'
  | 'siamese'
  | 'black'
  | 'white'
  | 'blue-gray'
  | 'gray-white'
  | 'orange-white'
  | 'tortoiseshell'
  | 'cream'
  | 'silver';

/** Modo de fundo do overlay (transparente por padrão ou Chroma Key opcional). */
export type ChromaMode = 'transparent' | 'green' | 'magenta';

/** Preferências dos efeitos sonoros opcionais sintetizados via Web Audio API. */
export interface AudioConfig {
  enabled: boolean;
  keyVolume: number;
  mouseVolume: number;
  purrVolume: number;
}

/** Posição salva da janela overlay na área de trabalho (pixels físicos/lógicos). */
export interface WindowPosition {
  x: number;
  y: number;
}

/** Configuração global persistida do Teglato. */
export interface AppConfig {
  coat: CoatId;
  /** Fator de escala da janela overlay (0.5 a 2.0; padrão 1.0 = 360x270). */
  scale: number;
  /** Opacidade global do gato e da mesa (0.3 a 1.0). */
  opacity: number;
  alwaysOnTop: boolean;
  /** Quando true, ativa click-through total até mesmo sobre o gato. */
  locked: boolean;
  autostart: boolean;
  /** Tempo sem atividade (segundos) até o gato fechar os olhos e dormir. */
  sleepTimeoutSec: number;
  /** Porta local do servidor HTTP/WebSocket para o OBS Studio (127.0.0.1). */
  obsPort: number;
  chromaMode: ChromaMode;
  audio: AudioConfig;
  position: WindowPosition | null;
}

/** Configuração inicial padrão usada no primeiro lançamento e em fallbacks. */
export const DEFAULT_CONFIG: AppConfig = {
  coat: 'tuxedo',
  scale: 1.0,
  opacity: 1.0,
  alwaysOnTop: true,
  locked: false,
  autostart: false,
  sleepTimeoutSec: 60,
  obsPort: 3777,
  chromaMode: 'transparent',
  audio: {
    enabled: false,
    keyVolume: 0.35,
    mouseVolume: 0.3,
    purrVolume: 0.2,
  },
  position: null,
};

/** Botões de mouse suportados pelo hook global. */
export type MouseButton = 'left' | 'right' | 'middle';

/** Evento normalizado de entrada global (sem armazenar texto ou senhas). */
export type InputEvent =
  | { type: 'key_down'; code: string }
  | { type: 'key_up'; code: string }
  | { type: 'mouse_move'; x: number; y: number }
  | { type: 'mouse_down'; button: MouseButton }
  | { type: 'mouse_up'; button: MouseButton };

/** Mensagem enviada pelo servidor local WebSocket para o OBS Browser Source. */
export type WsMessage =
  | { kind: 'input'; event: InputEvent }
  | { kind: 'config'; config: AppConfig };
