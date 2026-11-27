/**
 * Mapeamento do mini teclado compacto ANSI de 5 fileiras (63 teclas) igual ao original,
 * além de fallbacks para garantir que teclados ABNT2/PT-BR e numpads acionem teclas equivalentes.
 */

export type HandSide = 'left' | 'right';

export interface VisualKeyDef {
  /** Código DOM principal (`KeyboardEvent.code`). */
  code: string;
  /** Fileira de 0 (topo) a 4 (barra de espaço). */
  row: number;
  /** Posição horizontal em unidades de tecla (1u = tecla padrão). */
  col: number;
  /** Largura em unidades de tecla. */
  width: number;
  /** Mão preferencial para alcançar esta tecla quando ambas estão livres. */
  hand: HandSide;
}

export interface BoardBounds {
  /** Centro X da borda superior do teclado. */
  topCenterX: number;
  /** Y da borda superior do teclado. */
  topY: number;
  /** Largura da borda superior do teclado. */
  topWidth: number;
  /** Largura da borda inferior do teclado (efeito perspectiva). */
  bottomWidth: number;
  /** Altura total da área das teclas. */
  height: number;
}

export interface KeyPolygon {
  code: string;
  hand: HandSide;
  /** Centro exato da tecla (usado como alvo da patinha). */
  cx: number;
  cy: number;
  /** Quatro vértices em sentido horário: TL, TR, BR, BL. */
  points: [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
  ];
}

const TOTAL_COLS = 15;
const TOTAL_ROWS = 5;

function key(
  code: string,
  row: number,
  col: number,
  width: number,
  hand: HandSide,
): VisualKeyDef {
  return { code, row, col, width, hand };
}

/**
 * Grade compacta 65% ANSI de 5 fileiras (15 unidades de largura x 5 fileiras),
 * reproduzindo fielmente o mini teclado do vídeo.
 */
export const VISUAL_KEYS: readonly VisualKeyDef[] = [
  // Fileira 0: Números + Backspace
  key('Escape', 0, 0, 1, 'left'),
  key('Digit1', 0, 1, 1, 'left'),
  key('Digit2', 0, 2, 1, 'left'),
  key('Digit3', 0, 3, 1, 'left'),
  key('Digit4', 0, 4, 1, 'left'),
  key('Digit5', 0, 5, 1, 'left'),
  key('Digit6', 0, 6, 1, 'left'),
  key('Digit7', 0, 7, 1, 'right'),
  key('Digit8', 0, 8, 1, 'right'),
  key('Digit9', 0, 9, 1, 'right'),
  key('Digit0', 0, 10, 1, 'right'),
  key('Minus', 0, 11, 1, 'right'),
  key('Equal', 0, 12, 1, 'right'),
  key('Backspace', 0, 13, 2, 'right'),

  // Fileira 1: Tab + QWERTY...
  key('Tab', 1, 0, 1.4, 'left'),
  key('KeyQ', 1, 1.4, 1, 'left'),
  key('KeyW', 1, 2.4, 1, 'left'),
  key('KeyE', 1, 3.4, 1, 'left'),
  key('KeyR', 1, 4.4, 1, 'left'),
  key('KeyT', 1, 5.4, 1, 'left'),
  key('KeyY', 1, 6.4, 1, 'right'),
  key('KeyU', 1, 7.4, 1, 'right'),
  key('KeyI', 1, 8.4, 1, 'right'),
  key('KeyO', 1, 9.4, 1, 'right'),
  key('KeyP', 1, 10.4, 1, 'right'),
  key('BracketLeft', 1, 11.4, 1, 'right'),
  key('BracketRight', 1, 12.4, 1, 'right'),
  key('Backslash', 1, 13.4, 1.6, 'right'),

  // Fileira 2: CapsLock + ASDF... + Enter
  key('CapsLock', 2, 0, 1.75, 'left'),
  key('KeyA', 2, 1.75, 1, 'left'),
  key('KeyS', 2, 2.75, 1, 'left'),
  key('KeyD', 2, 3.75, 1, 'left'),
  key('KeyF', 2, 4.75, 1, 'left'),
  key('KeyG', 2, 5.75, 1, 'left'),
  key('KeyH', 2, 6.75, 1, 'right'),
  key('KeyJ', 2, 7.75, 1, 'right'),
  key('KeyK', 2, 8.75, 1, 'right'),
  key('KeyL', 2, 9.75, 1, 'right'),
  key('Semicolon', 2, 10.75, 1, 'right'),
  key('Quote', 2, 11.75, 1, 'right'),
  key('Enter', 2, 12.75, 2.25, 'right'),

  // Fileira 3: Shift + ZXCV... + Seta Cima
  key('ShiftLeft', 3, 0, 2.15, 'left'),
  key('KeyZ', 3, 2.15, 1, 'left'),
  key('KeyX', 3, 3.15, 1, 'left'),
  key('KeyC', 3, 4.15, 1, 'left'),
  key('KeyV', 3, 5.15, 1, 'left'),
  key('KeyB', 3, 6.15, 1, 'left'),
  key('KeyN', 3, 7.15, 1, 'right'),
  key('KeyM', 3, 8.15, 1, 'right'),
  key('Comma', 3, 9.15, 1, 'right'),
  key('Period', 3, 10.15, 1, 'right'),
  key('Slash', 3, 11.15, 1, 'right'),
  key('ShiftRight', 3, 12.15, 1.85, 'right'),
  key('ArrowUp', 3, 14, 1, 'right'),

  // Fileira 4: Modificadores + Espaço + Setas
  key('ControlLeft', 4, 0, 1.25, 'left'),
  key('MetaLeft', 4, 1.25, 1.25, 'left'),
  key('AltLeft', 4, 2.5, 1.25, 'left'),
  key('Space', 4, 3.75, 6.25, 'right'),
  key('AltRight', 4, 10, 1, 'right'),
  key('ControlRight', 4, 11, 1, 'right'),
  key('ArrowLeft', 4, 12, 1, 'right'),
  key('ArrowDown', 4, 13, 1, 'right'),
  key('ArrowRight', 4, 14, 1, 'right'),
];

const VISUAL_KEY_MAP = new Map<string, VisualKeyDef>(
  VISUAL_KEYS.map((item) => [item.code, item]),
);

/**
 * Mapeamento de teclas extras (ABNT2, Numpad, teclas de função e navegação)
 * para a tecla visual equivalente na grade compacta de 63 teclas.
 */
const FALLBACK_KEY_MAP: Record<string, string> = {
  Backquote: 'Escape',
  IntlBackslash: 'ShiftLeft',
  IntlRo: 'Slash',
  IntlYen: 'Backslash',
  MetaRight: 'AltRight',
  ContextMenu: 'ControlRight',

  // Teclas de função mapeiam proporcionalmente na fileira numérica
  F1: 'Digit1',
  F2: 'Digit2',
  F3: 'Digit3',
  F4: 'Digit4',
  F5: 'Digit5',
  F6: 'Digit6',
  F7: 'Digit7',
  F8: 'Digit8',
  F9: 'Digit9',
  F10: 'Digit0',
  F11: 'Minus',
  F12: 'Equal',

  // Navegação e sistema
  PrintScreen: 'Backspace',
  ScrollLock: 'Backspace',
  Pause: 'Backspace',
  Insert: 'Backspace',
  Delete: 'Backspace',
  Home: 'Backslash',
  End: 'Enter',
  PageUp: 'Backslash',
  PageDown: 'Enter',

  // Teclado numérico (Numpad)
  NumLock: 'Digit7',
  Numpad0: 'Digit0',
  Numpad1: 'Digit1',
  Numpad2: 'Digit2',
  Numpad3: 'Digit3',
  Numpad4: 'Digit4',
  Numpad5: 'Digit5',
  Numpad6: 'Digit6',
  Numpad7: 'Digit7',
  Numpad8: 'Digit8',
  Numpad9: 'Digit9',
  NumpadAdd: 'Equal',
  NumpadSubtract: 'Minus',
  NumpadMultiply: 'Digit8',
  NumpadDivide: 'Slash',
  NumpadDecimal: 'Period',
  NumpadComma: 'Comma',
  NumpadEnter: 'Enter',
};

/** Resolve qualquer código de tecla física para uma tecla visual da grade compacta. */
export function resolveVisualKey(code: string): VisualKeyDef | null {
  const direct = VISUAL_KEY_MAP.get(code);
  if (direct) {
    return direct;
  }
  const alias = FALLBACK_KEY_MAP[code];
  return alias ? (VISUAL_KEY_MAP.get(alias) ?? null) : null;
}

/**
 * Converte coordenadas normalizadas da grade (u: 0..1, v: 0..1)
 * para pontos em perspectiva trapezoidal do mini teclado.
 */
function projectBoardPoint(
  bounds: BoardBounds,
  u: number,
  v: number,
): { x: number; y: number } {
  // Leve aceleração vertical simula profundidade da perspectiva frontal
  const easedV = v * (0.92 + 0.08 * v);
  const rowWidth = bounds.topWidth + (bounds.bottomWidth - bounds.topWidth) * easedV;
  const x = bounds.topCenterX + (u - 0.5) * rowWidth;
  const y = bounds.topY + easedV * bounds.height;
  return { x, y };
}

/**
 * Calcula os polígonos e centros de todas as 63 teclas dentro de `bounds`,
 * rotacionadas em 180° (posição normal vista de frente para o gato: barra de espaço
 * próxima ao peito, fileira numérica na frente, mão esquerda do gato à direita da tela).
 */
export function computeKeyRects(bounds: BoardBounds): Map<string, KeyPolygon> {
  const result = new Map<string, KeyPolygon>();
  const gapU = 0.09 / TOTAL_COLS;
  const gapV = 0.08 / TOTAL_ROWS;

  for (const item of VISUAL_KEYS) {
    const u0 = item.col / TOTAL_COLS + gapU;
    const u1 = (item.col + item.width) / TOTAL_COLS - gapU;
    const v0 = item.row / TOTAL_ROWS + gapV;
    const v1 = (item.row + 1) / TOTAL_ROWS - gapV;

    // Espelha horizontal e verticalmente (rotação de 180° na perspectiva do gato)
    const uMin = 1 - u1;
    const uMax = 1 - u0;
    const vMin = 1 - v1;
    const vMax = 1 - v0;

    const tl = projectBoardPoint(bounds, uMin, vMin);
    const tr = projectBoardPoint(bounds, uMax, vMin);
    const br = projectBoardPoint(bounds, uMax, vMax);
    const bl = projectBoardPoint(bounds, uMin, vMax);

    const cx = (tl.x + tr.x + br.x + bl.x) * 0.25;
    const cy = (tl.y + tr.y + br.y + bl.y) * 0.25;

    result.set(item.code, {
      code: item.code,
      hand: item.hand,
      cx,
      cy,
      points: [tl, tr, br, bl],
    });
  }

  return result;
}
