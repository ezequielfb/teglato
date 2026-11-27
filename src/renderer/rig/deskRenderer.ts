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

/** Posição da bolinha de lã vermelha no canto inferior direito do mousepad (botão Fechar). */
export const YARN_BALL = {
  cx: 398,
  cy: 313,
  radius: 11.5,
  hitRadius: 15,
};

export interface DeskRenderOptions {
  hoverYarnBall?: boolean;
  showCloseTooltip?: boolean;
}

/** Verifica se uma coordenada lógica (480x360) está sobre a bolinha de lã vermelha. */
export function isPointOnYarnBall(logicalX: number, logicalY: number): boolean {
  return Math.hypot(logicalX - YARN_BALL.cx, logicalY - YARN_BALL.cy) <= YARN_BALL.hitRadius;
}

/** Pré-cálculo único das 63 teclas para 60 FPS sem alocações repetidas por frame. */
export const KEY_POLYGONS: Map<string, KeyPolygon> = computeKeyRects(KEYBOARD_BOUNDS);

export interface DeskGeometry {
  mouseCenter: Point2D;
  mouseTopPoint: Point2D;
}

/**
 * Calcula a posição atual do mini mouse na mesa a partir da posição normalizada (0..1),
 * espelhando o movimento para a perspectiva do gato (180°).
 */
export function getMouseGeometry(state: CatStateMachine): DeskGeometry {
  const mx = MOUSE_PAD_AREA.cx + (0.5 - state.mousePos.x) * 2 * MOUSE_PAD_AREA.rangeX;
  const my = MOUSE_PAD_AREA.cy + (0.5 - state.mousePos.y) * 2 * MOUSE_PAD_AREA.rangeY;
  return {
    mouseCenter: { x: mx, y: my },
    mouseTopPoint: { x: mx + 1, y: my - 3 },
  };
}

/**
 * Desenha o tapete de mesa trapezoidal, a sombra, o mini mouse móvel,
 * o mini teclado e a bolinha de lã vermelha para fechar o aplicativo.
 */
export function renderDesk(
  ctx: CanvasRenderingContext2D,
  state: CatStateMachine,
  options: DeskRenderOptions = {},
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

  // 5. Bolinha de lã vermelha no canto inferior direito do mousepad (Fechar)
  drawYarnBall(ctx, options);

  ctx.restore();
  return deskGeo;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawYarnBall(
  ctx: CanvasRenderingContext2D,
  options: DeskRenderOptions,
): void {
  const hovered = Boolean(options.hoverYarnBall);
  const scale = hovered ? 1.18 : 1.0;
  const { cx, cy, radius } = YARN_BALL;

  ctx.save();
  ctx.translate(cx, cy);

  // Sombra de contato no tapete da mesa
  ctx.fillStyle = hovered ? 'rgba(255, 71, 71, 0.38)' : 'rgba(0, 0, 0, 0.34)';
  ctx.beginPath();
  ctx.ellipse(
    0,
    hovered ? 2 : 5,
    hovered ? radius * 1.45 : radius * 1.1,
    hovered ? radius * 1.45 : radius * 0.6,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Pontinha de fio solta no mousepad
  ctx.strokeStyle = hovered ? '#ff6b6b' : '#b82e2e';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-radius * 0.55, radius * 0.65);
  ctx.quadraticCurveTo(-radius - 7, radius + 3, -radius - 13, radius - 1.5);
  ctx.stroke();

  ctx.save();
  ctx.scale(scale, scale);

  // Esfera da bolinha de lã com gradiente para volume
  const grad = ctx.createRadialGradient(-3.5, -4, 1.5, 0, 0, radius);
  if (hovered) {
    grad.addColorStop(0, '#ff8585');
    grad.addColorStop(0.55, '#ff4747');
    grad.addColorStop(1, '#b82020');
  } else {
    grad.addColorStop(0, '#e55353');
    grad.addColorStop(0.6, '#c93838');
    grad.addColorStop(1, '#8f1f1f');
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Fios enrolados característicos da bolinha de lã (clipados ao círculo)
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = hovered ? 'rgba(255, 232, 232, 0.55)' : 'rgba(72, 12, 16, 0.45)';
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  ctx.arc(-3, -2, radius * 0.88, -0.5, 1.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(4, 3, radius * 0.85, 2.2, 4.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-radius, 1);
  ctx.quadraticCurveTo(0, -5, radius, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3, -radius);
  ctx.quadraticCurveTo(5, 0, -2, radius);
  ctx.stroke();
  ctx.restore();

  // Borda de destaque forte quando em hover vs contorno discreto normal
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = hovered ? '#fff3cf' : '#2a1214';
  ctx.lineWidth = hovered ? 2.0 : 1.3;
  ctx.stroke();
  ctx.restore();

  // Legenda "Fechar" ao passar o mouse
  if (hovered && options.showCloseTooltip !== false) {
    const label = 'Fechar';
    const boxW = 54;
    const boxH = 21;
    // Garante que a legenda nunca corte na borda direita do canvas (480px)
    const boxX = Math.min(480 - cx - boxW - 6, -boxW * 0.5);
    const boxY = -radius * scale - boxH - 8;

    ctx.fillStyle = 'rgba(20, 22, 28, 0.94)';
    ctx.strokeStyle = '#fff3cf';
    ctx.lineWidth = 1.25;
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff8e1';
    ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, boxX + boxW * 0.5, boxY + boxH * 0.5 + 0.5);
  }

  ctx.restore();
}

function drawMiniMouse(
  ctx: CanvasRenderingContext2D,
  center: Point2D,
  buttons: { left: boolean; right: boolean; middle: boolean },
): void {
  const pressOffset = buttons.left || buttons.right || buttons.middle ? 1.5 : 0;

  ctx.save();
  ctx.translate(center.x, center.y + pressOffset);
  ctx.rotate(0.08);

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

  // Botões na parte frontal (inferior da tela, apontando para longe do gato)
  // Botão esquerdo (indicador direito do gato = lado interno próximo ao teclado, x > 0)
  if (buttons.left) {
    ctx.fillStyle = '#f8cb4b';
    ctx.beginPath();
    ctx.ellipse(4.5, 2.2, 6.5, 4.2, -0.1, 0, Math.PI);
    ctx.fill();
  }
  // Botão direito (dedo médio direito do gato = lado externo, x < 0)
  if (buttons.right) {
    ctx.fillStyle = '#f8cb4b';
    ctx.beginPath();
    ctx.ellipse(-4.5, 2.2, 6.5, 4.2, 0.1, 0, Math.PI);
    ctx.fill();
  }

  // Divisória dos botões e rodinha (scroll wheel) voltados para a frente
  ctx.strokeStyle = '#cfd3dc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-12.5, 0.5);
  ctx.quadraticCurveTo(0, 2, 12.5, 0.5);
  ctx.moveTo(0, 1.5);
  ctx.lineTo(0, 8.8);
  ctx.stroke();

  ctx.fillStyle = '#535866';
  ctx.beginPath();
  ctx.roundRect(-1.4, 3.4, 2.8, 4.4, 1.2);
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
