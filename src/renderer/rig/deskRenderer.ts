import { computeKeyRects, type BoardBounds, type KeyPolygon } from '../../shared/keyMap.ts';
import type { CatStateMachine, Point2D } from '../state.ts';

/** Dimensões lógicas fixas da cena (proporção 4:3 limpa). */
export const LOGICAL_WIDTH = 480;
export const LOGICAL_HEIGHT = 360;

/** Limites do mini teclado compacto em perspectiva dentro do canvas 480x360. */
export const KEYBOARD_BOUNDS: BoardBounds = {
  topCenterX: 274,
  topY: 270,
  topWidth: 184,
  bottomWidth: 204,
  height: 46,
};

/** Zona de movimento do mini mouse (à esquerda do teclado, igual ao vídeo). */
export const MOUSE_PAD_AREA = {
  cx: 138,
  cy: 292,
  rangeX: 16,
  rangeY: 11,
};

/** Pré-cálculo único das 63 teclas para 60 FPS sem alocações repetidas por frame. */
export const KEY_POLYGONS: Map<string, KeyPolygon> = computeKeyRects(KEYBOARD_BOUNDS);

export interface DeskGeometry {
  mouseCenter: Point2D;
  mouseTopPoint: Point2D;
}

/**
 * Calcula a posição atual do mini mouse na mesa a partir da posição normalizada (0..1).
 */
export function getMouseGeometry(state: CatStateMachine): DeskGeometry {
  const mx = MOUSE_PAD_AREA.cx + (state.mousePos.x - 0.5) * 2 * MOUSE_PAD_AREA.rangeX;
  const my = MOUSE_PAD_AREA.cy + (state.mousePos.y - 0.5) * 2 * MOUSE_PAD_AREA.rangeY;
  return {
    mouseCenter: { x: mx, y: my },
    mouseTopPoint: { x: mx + 1, y: my - 4 },
  };
}

/**
 * Desenha o tapete de mesa trapezoidal, a sombra, o mini mouse móvel e o mini teclado
 * com destaque dourado nas teclas pressionadas.
 */
export function renderDesk(
  ctx: CanvasRenderingContext2D,
  state: CatStateMachine,
): DeskGeometry {
  const deskGeo = getMouseGeometry(state);

  // 1. Sombra projetada sutil abaixo do desk mat
  ctx.save();
  ctx.fillStyle = 'rgba(10, 12, 16, 0.24)';
  ctx.beginPath();
  ctx.moveTo(86, 268);
  ctx.lineTo(394, 268);
  ctx.lineTo(426, 336);
  ctx.lineTo(54, 336);
  ctx.closePath();
  ctx.fill();

  // 2. Superfície trapezoidal do desk mat (fiel ao original)
  ctx.fillStyle = '#2d3038';
  ctx.beginPath();
  ctx.moveTo(90, 258);
  ctx.lineTo(390, 258);
  ctx.lineTo(420, 328);
  ctx.lineTo(60, 328);
  ctx.closePath();
  ctx.fill();

  // Borda frontal 3D sutil da mesa
  ctx.fillStyle = '#1c1e24';
  ctx.beginPath();
  ctx.moveTo(60, 328);
  ctx.lineTo(420, 328);
  ctx.lineTo(417, 333);
  ctx.lineTo(63, 333);
  ctx.closePath();
  ctx.fill();

  // Linha sutil de destaque na borda traseira do desk mat
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(92, 259);
  ctx.lineTo(388, 259);
  ctx.stroke();

  // 3. Mini mouse à esquerda
  drawMiniMouse(ctx, deskGeo.mouseCenter, state.mouseButtons);

  // 4. Mini teclado compacto em perspectiva
  drawMiniKeyboard(ctx, state.pressedKeys);

  ctx.restore();
  return deskGeo;
}

function drawMiniMouse(
  ctx: CanvasRenderingContext2D,
  center: Point2D,
  buttons: { left: boolean; right: boolean; middle: boolean },
): void {
  const pressOffset = buttons.left || buttons.right || buttons.middle ? 1.5 : 0;

  ctx.save();
  ctx.translate(center.x, center.y + pressOffset);
  ctx.rotate(-0.08);

  // Sombra do mouse
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 4 - pressOffset * 0.5, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Base escura do mouse
  ctx.fillStyle = '#24272e';
  ctx.beginPath();
  ctx.ellipse(0, 1.5, 14.5, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corpo claro arredondado
  ctx.fillStyle = '#f2f3f7';
  ctx.beginPath();
  ctx.ellipse(0, -1, 14, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Destaque nos botões quando clicados
  if (buttons.left) {
    ctx.fillStyle = '#f8cb4b';
    ctx.beginPath();
    ctx.ellipse(-4.5, -4, 6.5, 4.2, -0.1, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  if (buttons.right) {
    ctx.fillStyle = '#f8cb4b';
    ctx.beginPath();
    ctx.ellipse(4.5, -4, 6.5, 4.2, 0.1, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // Divisória dos botões e rodinha (scroll wheel)
  ctx.strokeStyle = '#cfd3dc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-12.5, -2.5);
  ctx.quadraticCurveTo(0, -1, 12.5, -2.5);
  ctx.moveTo(0, -10.2);
  ctx.lineTo(0, -1.5);
  ctx.stroke();

  ctx.fillStyle = '#535866';
  ctx.beginPath();
  ctx.roundRect(-1.4, -7.8, 2.8, 4.6, 1.2);
  ctx.fill();

  ctx.restore();
}

function drawMiniKeyboard(
  ctx: CanvasRenderingContext2D,
  pressedKeys: Map<string, number>,
): void {
  const { topCenterX, topY, topWidth, bottomWidth, height } = KEYBOARD_BOUNDS;
  const padX = 7;
  const padY = 5;

  const caseTL = { x: topCenterX - topWidth * 0.5 - padX, y: topY - padY };
  const caseTR = { x: topCenterX + topWidth * 0.5 + padX, y: topY - padY };
  const caseBR = { x: topCenterX + bottomWidth * 0.5 + padX + 2, y: topY + height + padY };
  const caseBL = { x: topCenterX - bottomWidth * 0.5 - padX - 2, y: topY + height + padY };

  // Base inferior do teclado
  ctx.fillStyle = '#17191f';
  ctx.beginPath();
  ctx.moveTo(caseBL.x, caseBL.y);
  ctx.lineTo(caseBR.x, caseBR.y);
  ctx.lineTo(caseBR.x - 1, caseBR.y + 4);
  ctx.lineTo(caseBL.x + 1, caseBL.y + 4);
  ctx.closePath();
  ctx.fill();

  // Moldura superior do chassi
  ctx.fillStyle = '#3b3f4a';
  ctx.beginPath();
  ctx.moveTo(caseTL.x, caseTL.y);
  ctx.lineTo(caseTR.x, caseTR.y);
  ctx.lineTo(caseBR.x, caseBR.y);
  ctx.lineTo(caseBL.x, caseBL.y);
  ctx.closePath();
  ctx.fill();

  // Cavidade interna escura atrás das keycaps
  ctx.fillStyle = '#202229';
  ctx.beginPath();
  ctx.moveTo(topCenterX - topWidth * 0.5 - 2, topY - 1.5);
  ctx.lineTo(topCenterX + topWidth * 0.5 + 2, topY - 1.5);
  ctx.lineTo(topCenterX + bottomWidth * 0.5 + 2, topY + height + 1.5);
  ctx.lineTo(topCenterX - bottomWidth * 0.5 - 2, topY + height + 1.5);
  ctx.closePath();
  ctx.fill();

  // Desenho de cada uma das 63 teclas
  for (const poly of KEY_POLYGONS.values()) {
    const isPressed = pressedKeys.has(poly.code);
    const dy = isPressed ? 1.5 : 0;
    const [tl, tr, br, bl] = poly.points;

    // Sombra/lateral inferior da tecla quando não pressionada
    if (!isPressed) {
      ctx.fillStyle = '#aeb4c2';
      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(br.x, br.y + 1.6);
      ctx.lineTo(bl.x, bl.y + 1.6);
      ctx.closePath();
      ctx.fill();
    }

    // Topo da keycap (branco gelo normal, dourado quente ao pressionar)
    ctx.fillStyle = isPressed ? '#ffcf48' : '#f4f5f8';
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y + dy);
    ctx.lineTo(tr.x, tr.y + dy);
    ctx.lineTo(br.x, br.y + dy);
    ctx.lineTo(bl.x, bl.y + dy);
    ctx.closePath();
    ctx.fill();

    if (isPressed) {
      ctx.strokeStyle = '#ffefb3';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
}
