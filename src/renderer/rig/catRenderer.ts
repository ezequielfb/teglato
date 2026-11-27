import type { CoatId } from '../../shared/types.ts';
import type { CatStateMachine, Point2D } from '../state.ts';
import { getCoat, type CoatDefinition } from './coats.ts';
import { KEY_POLYGONS, type DeskGeometry } from './deskRenderer.ts';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/**
 * Controlador visual com suavização das patas para renderizar o gato a 60 FPS
 * fiel às proporções, expressões, cauda e 13 pelagens do LittleOne.
 */
export class CatRenderer {
  private leftPawPos: Point2D = { x: 196, y: 264 };
  private rightPawPos: Point2D = { x: 294, y: 264 };
  private leftPawLift = 0;
  private rightPawLift = 0;

  /**
   * Atualiza a interpolação suave das patinhas em direção ao mouse, teclas ou repouso.
   */
  updatePaws(dt: number, state: CatStateMachine, desk: DeskGeometry): void {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    const speed = 1 - Math.exp(-26 * safeDt);
    const sleep = state.sleepBlend;

    // Alvo da pata esquerda da tela (mão DIREITA do gato: mouse ou teclas direitas)
    let leftTarget: Point2D = { x: 194, y: 262 };
    let leftDesiredLift = 0;

    if (sleep > 0.5) {
      leftTarget = { x: 204, y: 256 };
    } else if (state.isPawHoldingMouse()) {
      leftTarget = desk.mouseTopPoint;
      leftDesiredLift = state.mouseButtons.left || state.mouseButtons.right ? 0 : 1;
    } else if (state.activeRightKey) {
      const keyPoly = KEY_POLYGONS.get(state.activeRightKey);
      if (keyPoly) {
        leftTarget = { x: keyPoly.cx, y: keyPoly.cy };
        leftDesiredLift = 0;
      }
    }

    // Alvo da pata direita da tela (mão ESQUERDA do gato: teclas esquerdas ou alcance total)
    let rightTarget: Point2D = { x: 296, y: 262 };
    let rightDesiredLift = 0;

    if (sleep > 0.5) {
      rightTarget = { x: 288, y: 256 };
    } else if (state.activeLeftKey) {
      const keyPoly = KEY_POLYGONS.get(state.activeLeftKey);
      if (keyPoly) {
        rightTarget = { x: keyPoly.cx, y: keyPoly.cy };
        rightDesiredLift = 0;
      }
    }

    this.leftPawPos = lerpPoint(this.leftPawPos, leftTarget, speed);
    this.rightPawPos = lerpPoint(this.rightPawPos, rightTarget, speed);
    this.leftPawLift = lerp(this.leftPawLift, leftDesiredLift, speed);
    this.rightPawLift = lerp(this.rightPawLift, rightDesiredLift, speed);
  }

  /** Desenha a cauda e o corpo do gato (atrás da mesa/teclado). */
  renderBackAndBody(
    ctx: CanvasRenderingContext2D,
    state: CatStateMachine,
    coatId: CoatId,
  ): void {
    const coat = getCoat(coatId);
    const breathY = Math.sin(state.breathPhase) * (1.8 + state.sleepBlend * 1.1);
    const slumpY = state.sleepBlend * 11;

    this.drawTail(ctx, state, coat, slumpY);
    this.drawBody(ctx, coat, breathY, slumpY, true);
  }

  /**
   * Desenha os braços fundidos continuamente ao tronco (sem recorte nos ombros),
   * as patas sobre a mesa/teclado e a cabeça por cima.
   */
  renderHeadAndPaws(
    ctx: CanvasRenderingContext2D,
    state: CatStateMachine,
    coatId: CoatId,
  ): void {
    const coat = getCoat(coatId);
    const breathY = Math.sin(state.breathPhase) * (1.5 + state.sleepBlend * 0.9);
    const slumpY = state.sleepBlend * 13;

    const shoulderLeft: Point2D = { x: 209, y: 223 + breathY * 0.5 + slumpY * 0.65 };
    const shoulderRight: Point2D = { x: 289, y: 223 + breathY * 0.5 + slumpY * 0.65 };
    const leftActive = state.activeRightKey !== null || state.isPawHoldingMouse();
    const rightActive = state.activeLeftKey !== null;

    // Passo 1: sombra das patas + contorno externo dos braços
    this.drawArmOutlineAndShadow(
      ctx,
      coat,
      shoulderLeft,
      this.leftPawPos,
      -1,
      this.leftPawLift,
      leftActive,
    );
    this.drawArmOutlineAndShadow(
      ctx,
      coat,
      shoulderRight,
      this.rightPawPos,
      1,
      this.rightPawLift,
      rightActive,
    );

    // Passo 2: preenche o tronco acima da mesa (y < 258) para esconder o contorno interno dos ombros
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 480, 258);
    ctx.clip();
    this.drawBody(ctx, coat, breathY, slumpY, false);
    ctx.restore();

    // Passo 3: preenchimento contínuo dos braços + pontinhas das patas sem recorte
    this.drawArmFillAndPawTip(
      ctx,
      coat,
      shoulderLeft,
      this.leftPawPos,
      -1,
      this.leftPawLift,
      leftActive,
    );
    this.drawArmFillAndPawTip(
      ctx,
      coat,
      shoulderRight,
      this.rightPawPos,
      1,
      this.rightPawLift,
      rightActive,
    );

    // Passo 4: cabeça por cima da junção do pescoço
    this.drawHead(ctx, state, coat, breathY, slumpY);
  }

  private drawTail(
    ctx: CanvasRenderingContext2D,
    state: CatStateMachine,
    coat: CoatDefinition,
    slumpY: number,
  ): void {
    const awakeSway = Math.sin(state.tailPhase) * 16 * (1 - state.sleepBlend);
    const awakeTipSway = Math.sin(state.tailPhase - 0.7) * 21 * (1 - state.sleepBlend);
    const sleepRest = state.sleepBlend;

    const base = { x: 294, y: 252 + slumpY * 0.35 };
    const cp1 = {
      x: lerp(342, 344, sleepRest) + awakeSway * 0.35,
      y: lerp(248, 260, sleepRest),
    };
    const cp2 = {
      x: lerp(364, 376, sleepRest) + awakeSway * 0.75,
      y: lerp(208, 258, sleepRest),
    };
    const tip = {
      x: lerp(352, 386, sleepRest) + awakeTipSway,
      y: lerp(164, 249, sleepRest),
    };

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Contorno sutil para contraste em fundos claros/pelagens brancas
    ctx.strokeStyle = coat.outlineColor;
    ctx.lineWidth = 17.5;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, tip.x, tip.y);
    ctx.stroke();

    // Base da cauda (sólida com contraste limpo para rajados, escaminha e tricolor)
    const tailColor =
      coat.pattern === 'calico'
        ? coat.markingColorAlt
        : coat.pattern === 'tabby' || coat.pattern === 'tortoiseshell'
          ? coat.markingColor
          : coat.baseColor;

    ctx.strokeStyle = tailColor;
    ctx.lineWidth = 14.5;
    ctx.stroke();

    // Detalhes suaves da ponta apenas para siamês e bicolores
    if (coat.pattern === 'siamese') {
      ctx.strokeStyle = coat.secondaryColor;
      ctx.lineWidth = 14.5;
      ctx.beginPath();
      ctx.moveTo(lerp(cp2.x, tip.x, 0.35), lerp(cp2.y, tip.y, 0.35));
      ctx.quadraticCurveTo(cp2.x, cp2.y, tip.x, tip.y);
      ctx.stroke();
    } else if (coat.pattern === 'bicolor' || coat.pattern === 'tuxedo') {
      ctx.fillStyle = coat.pawTipColor;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 7.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawBody(
    ctx: CanvasRenderingContext2D,
    coat: CoatDefinition,
    breathY: number,
    slumpY: number,
    withOutline: boolean,
  ): void {
    const cx = 249;
    const topY = 186 + breathY * 0.4 + slumpY * 0.55;
    const bottomY = 266;

    const defineTorsoPath = () => {
      ctx.beginPath();
      ctx.moveTo(cx - 56, bottomY);
      ctx.bezierCurveTo(cx - 58, 222 + slumpY * 0.4, cx - 44, topY, cx, topY);
      ctx.bezierCurveTo(cx + 44, topY, cx + 58, 222 + slumpY * 0.4, cx + 56, bottomY);
      ctx.closePath();
    };

    ctx.save();
    defineTorsoPath();
    ctx.fillStyle = coat.baseColor;
    ctx.fill();

    // Clip para desenhar marcas internas dentro do corpo sem vazar
    ctx.save();
    defineTorsoPath();
    ctx.clip();

    if (coat.pattern === 'tuxedo' || coat.pattern === 'bicolor') {
      ctx.fillStyle = coat.secondaryColor;
      ctx.beginPath();
      ctx.ellipse(cx, 246 + slumpY * 0.25, 29, 44, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (coat.pattern === 'tabby') {
      ctx.fillStyle = coat.secondaryColor;
      ctx.beginPath();
      ctx.ellipse(cx, 250 + slumpY * 0.2, 22, 34, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = coat.markingColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      for (const offset of [-38, 38]) {
        ctx.beginPath();
        ctx.moveTo(cx + offset * 0.7, 214 + slumpY * 0.3);
        ctx.lineTo(cx + offset * 1.15, 222 + slumpY * 0.3);
        ctx.moveTo(cx + offset * 0.85, 232 + slumpY * 0.3);
        ctx.lineTo(cx + offset * 1.25, 240 + slumpY * 0.3);
        ctx.stroke();
      }
    } else if (coat.pattern === 'calico') {
      ctx.fillStyle = coat.markingColor;
      ctx.beginPath();
      ctx.ellipse(cx - 32, 224 + slumpY * 0.3, 24, 28, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = coat.markingColorAlt;
      ctx.beginPath();
      ctx.ellipse(cx + 35, 240 + slumpY * 0.3, 22, 26, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (coat.pattern === 'tortoiseshell') {
      ctx.fillStyle = coat.markingColor;
      ctx.beginPath();
      ctx.ellipse(cx - 20, 230 + slumpY * 0.3, 18, 22, 0.3, 0, Math.PI * 2);
      ctx.ellipse(cx + 26, 248 + slumpY * 0.2, 16, 18, -0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = coat.markingColorAlt;
      ctx.beginPath();
      ctx.ellipse(cx + 12, 214 + slumpY * 0.3, 17, 15, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (coat.pattern === 'siamese') {
      ctx.fillStyle = coat.markingColor;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(cx, 255, 48, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (withOutline) {
      defineTorsoPath();
      ctx.strokeStyle = coat.outlineColor;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHead(
    ctx: CanvasRenderingContext2D,
    state: CatStateMachine,
    coat: CoatDefinition,
    breathY: number,
    slumpY: number,
  ): void {
    const shakeX =
      state.wakeShakeTimer > 0
        ? Math.sin(state.wakeShakeTimer * 52) * 5.5 * (state.wakeShakeTimer / 0.45)
        : 0;

    const headCenter = {
      x: 249 + shakeX,
      y: 147 + breathY * 0.6 + slumpY,
    };

    ctx.save();
    ctx.translate(headCenter.x, headCenter.y);
    ctx.rotate(state.headTilt + state.sleepBlend * 0.04);

    // Orelhas (desenhadas junto com a cabeça para acompanhar inclinação)
    this.drawEar(ctx, coat, -1);
    this.drawEar(ctx, coat, 1);

    // Formato principal da cabeça (oval largo e fofo igual ao vídeo)
    const defineHeadPath = () => {
      ctx.beginPath();
      ctx.ellipse(0, 0, 56, 46, 0, 0, Math.PI * 2);
    };

    defineHeadPath();
    ctx.fillStyle = coat.baseColor;
    ctx.fill();

    // Marcações faciais dentro do recorte da cabeça
    ctx.save();
    defineHeadPath();
    ctx.clip();

    if (coat.pattern === 'tuxedo' || coat.pattern === 'bicolor') {
      // Focinho branco invertido em "V" suave
      ctx.fillStyle = coat.secondaryColor;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.bezierCurveTo(-18, 6, -34, 24, -34, 52);
      ctx.lineTo(34, 52);
      ctx.bezierCurveTo(34, 24, 18, 6, 0, -4);
      ctx.closePath();
      ctx.fill();
    } else if (coat.pattern === 'siamese') {
      // Máscara escura no centro do rosto
      ctx.fillStyle = coat.secondaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 8, 34, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (coat.pattern === 'calico') {
      ctx.fillStyle = coat.markingColor;
      ctx.beginPath();
      ctx.ellipse(-28, -22, 26, 24, -0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = coat.markingColorAlt;
      ctx.beginPath();
      ctx.ellipse(30, -24, 24, 22, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (coat.pattern === 'tortoiseshell') {
      ctx.fillStyle = coat.markingColor;
      ctx.beginPath();
      ctx.ellipse(26, -12, 20, 18, 0.3, 0, Math.PI * 2);
      ctx.ellipse(-28, 16, 18, 16, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = coat.markingColorAlt;
      ctx.beginPath();
      ctx.ellipse(-18, -22, 16, 14, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (coat.pattern === 'tabby') {
      // Marca em "M" na testa + listrinhas nas bochechas
      ctx.strokeStyle = coat.markingColor;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-11, -24);
      ctx.lineTo(-6, -35);
      ctx.lineTo(0, -26);
      ctx.lineTo(6, -35);
      ctx.lineTo(11, -24);
      ctx.stroke();

      // Listras laterais da bochecha
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(dir * 32, 6);
        ctx.lineTo(dir * 52, 3);
        ctx.moveTo(dir * 33, 14);
        ctx.lineTo(dir * 51, 15);
        ctx.stroke();
      }

      // Queixo claro
      ctx.fillStyle = coat.secondaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 26, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Contorno suave da cabeça
    defineHeadPath();
    ctx.strokeStyle = coat.outlineColor;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Olhos (abertos com olhar dinâmico, piscando ou fechados dormindo)
    this.drawEyes(ctx, state, coat);

    // Narizinho e boquinha fofa "w"
    ctx.fillStyle = coat.noseColor;
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(4, 10);
    ctx.quadraticCurveTo(0, 15.5, -4, 10);
    ctx.closePath();
    ctx.fill();

    const mouthStroke =
      coat.pattern === 'siamese'
        ? '#c7b5a1'
        : coat.id === 'black'
          ? '#6f7382'
          : '#3d373c';
    ctx.strokeStyle = mouthStroke;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 13.5);
    ctx.lineTo(0, 16.5);
    ctx.moveTo(-6, 17.5);
    ctx.quadraticCurveTo(-3, 20, 0, 16.5);
    ctx.quadraticCurveTo(3, 20, 6, 17.5);
    ctx.stroke();

    ctx.restore();
  }

  private drawEar(
    ctx: CanvasRenderingContext2D,
    coat: CoatDefinition,
    dir: -1 | 1,
  ): void {
    const outerColor =
      coat.pattern === 'siamese'
        ? coat.secondaryColor
        : coat.pattern === 'calico'
          ? dir === -1
            ? coat.markingColor
            : coat.markingColorAlt
          : coat.baseColor;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dir * 16, -34);
    ctx.quadraticCurveTo(dir * 42, -68, dir * 50, -58);
    ctx.quadraticCurveTo(dir * 54, -44, dir * 48, -14);
    ctx.closePath();
    ctx.fillStyle = outerColor;
    ctx.fill();
    ctx.strokeStyle = coat.outlineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Parte interna da orelha
    ctx.beginPath();
    ctx.moveTo(dir * 23, -32);
    ctx.quadraticCurveTo(dir * 40, -56, dir * 45, -49);
    ctx.quadraticCurveTo(dir * 47, -38, dir * 43, -19);
    ctx.closePath();
    ctx.fillStyle = coat.innerEarColor;
    ctx.fill();
    ctx.restore();
  }

  private drawEyes(
    ctx: CanvasRenderingContext2D,
    state: CatStateMachine,
    coat: CoatDefinition,
  ): void {
    const blinkFactor =
      state.blinkProgress > 0 ? Math.sin(state.blinkProgress * Math.PI) : 0;
    const closedAmount = Math.max(state.sleepBlend, blinkFactor);

    for (const dir of [-1, 1] as const) {
      const ex = dir * 21;
      const ey = -2;

      if (closedAmount > 0.72) {
        // Olhinho fechado dormindo/piscando em arco sereno
        const lineCol =
          coat.id === 'black' || coat.pattern === 'siamese'
            ? '#f0d89a'
            : coat.outlineColor;
        ctx.strokeStyle = lineCol;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - 9, ey + 1);
        ctx.quadraticCurveTo(ex, ey + 6.5, ex + 9, ey + 1);
        ctx.stroke();
        continue;
      }

      const eyeHeight = 11.2 * (1 - closedAmount * 0.85);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, ey, 11.2, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fillStyle = coat.eyeColor;
      ctx.fill();

      // Pupila acompanha levemente onde o gato está focando (mouse ou teclado)
      ctx.save();
      ctx.clip();
      const px = ex + state.gazeOffset.x * 3.2;
      const py = ey + state.gazeOffset.y * 2.2;
      ctx.fillStyle = coat.pupilColor;
      ctx.beginPath();
      ctx.ellipse(px, py, 5.4, Math.max(2.5, eyeHeight * 0.72), 0, 0, Math.PI * 2);
      ctx.fill();

      // Brilho nos olhos
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px - 2.6, py - 3.2, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + 2.4, py + 2.6, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(15, 16, 22, 0.45)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    }
  }

  private computeArmGeometry(
    shoulder: Point2D,
    pawTip: Point2D,
    sideSign: -1 | 1,
    liftAmount: number,
    isActive: boolean,
  ): { liftedTip: Point2D; ctrl: Point2D } {
    const liftedTip = {
      x: pawTip.x,
      y: pawTip.y - liftAmount * 3.5,
    };
    const ctrl = {
      x: lerp(shoulder.x, liftedTip.x, 0.48) + sideSign * 10,
      y: lerp(shoulder.y, liftedTip.y, 0.55) - (isActive ? 10 : 4),
    };
    return { liftedTip, ctrl };
  }

  private drawArmOutlineAndShadow(
    ctx: CanvasRenderingContext2D,
    coat: CoatDefinition,
    shoulder: Point2D,
    pawTip: Point2D,
    sideSign: -1 | 1,
    liftAmount: number,
    isActive: boolean,
  ): void {
    const { liftedTip, ctrl } = this.computeArmGeometry(
      shoulder,
      pawTip,
      sideSign,
      liftAmount,
      isActive,
    );

    ctx.save();
    ctx.lineCap = 'round';

    // Sombra sutil sob a pata quando alcançando o teclado/mouse
    if (isActive) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(pawTip.x, pawTip.y + 3.5, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = coat.outlineColor;
    ctx.lineWidth = 18.2;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, liftedTip.x, liftedTip.y);
    ctx.stroke();

    ctx.restore();
  }

  private drawArmFillAndPawTip(
    ctx: CanvasRenderingContext2D,
    coat: CoatDefinition,
    shoulder: Point2D,
    pawTip: Point2D,
    sideSign: -1 | 1,
    liftAmount: number,
    isActive: boolean,
  ): void {
    const { liftedTip, ctrl } = this.computeArmGeometry(
      shoulder,
      pawTip,
      sideSign,
      liftAmount,
      isActive,
    );

    const armColor =
      coat.pattern === 'calico'
        ? sideSign === -1
          ? coat.markingColor
          : coat.baseColor
        : coat.baseColor;

    ctx.save();
    ctx.lineCap = 'round';

    // Preenchimento contínuo do braço cobrindo a borda lateral do tronco na junção
    ctx.strokeStyle = armColor;
    ctx.lineWidth = 15.2;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, liftedTip.x, liftedTip.y);
    ctx.stroke();

    // Pontinha da pata (meinha branca ou ponta escura siamesa)
    ctx.fillStyle = coat.pawTipColor;
    ctx.beginPath();
    ctx.ellipse(liftedTip.x, liftedTip.y, 8.6, 6.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = coat.outlineColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Retorna os limites normalizados (0..1) aproximados da silhueta do gato + mesa
 * dentro do canvas 480x360, usados pelo Rust para click-through dinâmico preciso.
 */
export function getInteractiveHitBounds(): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  return {
    minX: 54 / 480,
    minY: 82 / 360,
    maxX: 426 / 480,
    maxY: 336 / 360,
  };
}
