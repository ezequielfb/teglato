import { resolveVisualKey, type HandSide } from '../shared/keyMap.ts';
import type { AppConfig, InputEvent } from '../shared/types.ts';

export interface Point2D {
  x: number;
  y: number;
}

export interface InputEffectResult {
  wokeUp: boolean;
  triggeredKey: string | null;
  triggeredMouseClick: boolean;
}

const MOUSE_ACTIVE_HOLD_SEC = 3.0;
const WAKE_SHAKE_DURATION_SEC = 0.45;
const BLINK_DURATION_SEC = 0.16;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(current: number, target: number, alpha: number): number {
  return current + (target - current) * alpha;
}

/**
 * Máquina de estados pura (sem dependência de DOM/Canvas) que controla:
 * - Teclas pressionadas e atribuição dinâmica de patas (incluindo uso simultâneo de mouse + teclado)
 * - Movimento suavizado do mouse e botões pressionados
 * - Piscadas naturais, balanço de cauda, respiração, modo sono e despertar chacoalhando a cabeça
 */
export class CatStateMachine {
  readonly pressedKeys = new Map<string, number>();
  private keySequence = 0;

  /**
   * Última tecla ativa atribuída a cada mão do gato:
   * - `activeLeftKey`: mão ESQUERDA do gato (lado direito da tela)
   * - `activeRightKey`: mão DIREITA do gato (lado esquerdo da tela, mesma pata do mouse)
   */
  activeLeftKey: string | null = null;
  activeRightKey: string | null = null;

  /** Posição normalizada do mouse (0..1) e alvo vindo do sistema operacional. */
  mousePos: Point2D = { x: 0.5, y: 0.5 };
  mouseTarget: Point2D = { x: 0.5, y: 0.5 };
  mouseButtons = { left: false, right: false, middle: false };

  /** Tempo restante considerando o mouse "em uso ativo" pela pata esquerda da tela. */
  mouseActiveTimer = 0;

  idleSeconds = 0;
  isSleeping = false;
  /** Transição suave de 0 (acordado) até 1 (completamente adormecido). */
  sleepBlend = 0;
  wakeShakeTimer = 0;

  blinkTimer = 3.2;
  blinkProgress = 0;
  private isBlinking = false;

  tailPhase = 0;
  breathPhase = 0;
  headTilt = 0;
  gazeOffset: Point2D = { x: 0, y: 0 };

  /**
   * Processa um evento global de teclado ou mouse e atualiza os alvos imediatos.
   */
  applyInput(event: InputEvent, _config: AppConfig): InputEffectResult {
    const result: InputEffectResult = {
      wokeUp: false,
      triggeredKey: null,
      triggeredMouseClick: false,
    };

    const wakeIfNeeded = () => {
      this.idleSeconds = 0;
      if (this.isSleeping || this.sleepBlend > 0.35) {
        this.isSleeping = false;
        this.wakeShakeTimer = WAKE_SHAKE_DURATION_SEC;
        result.wokeUp = true;
      }
    };

    switch (event.type) {
      case 'key_down': {
        const resolved = resolveVisualKey(event.code);
        if (!resolved) {
          return result;
        }
        wakeIfNeeded();
        if (!this.pressedKeys.has(resolved.code)) {
          this.keySequence += 1;
          this.pressedKeys.set(resolved.code, this.keySequence);
          result.triggeredKey = resolved.code;
        }
        this.rebalancePaws(resolved.code, resolved.hand);
        return result;
      }

      case 'key_up': {
        const resolved = resolveVisualKey(event.code);
        if (!resolved) {
          return result;
        }
        this.pressedKeys.delete(resolved.code);
        this.refreshActiveKeysAfterRelease(resolved.code);
        return result;
      }

      case 'mouse_move': {
        const nx = clamp(event.x, 0, 1);
        const ny = clamp(event.y, 0, 1);
        const movedEnough =
          Math.hypot(nx - this.mouseTarget.x, ny - this.mouseTarget.y) > 0.004;
        this.mouseTarget.x = nx;
        this.mouseTarget.y = ny;
        if (movedEnough) {
          wakeIfNeeded();
          this.mouseActiveTimer = MOUSE_ACTIVE_HOLD_SEC;
          this.transferRightPawToMouse();
        }
        return result;
      }

      case 'mouse_down': {
        wakeIfNeeded();
        this.mouseButtons[event.button] = true;
        this.mouseActiveTimer = MOUSE_ACTIVE_HOLD_SEC;
        this.transferRightPawToMouse();
        result.triggeredMouseClick = true;
        return result;
      }

      case 'mouse_up': {
        this.mouseButtons[event.button] = false;
        return result;
      }
    }
  }

  /**
   * Avança a simulação em `dt` segundos (clamp para evitar saltos ao trocar de aba/janela).
   */
  tick(rawDt: number, config: AppConfig): void {
    const dt = clamp(rawDt, 0, 0.05);
    if (dt <= 0) {
      return;
    }

    const anyMouseHeld =
      this.mouseButtons.left || this.mouseButtons.right || this.mouseButtons.middle;
    const hasActivity = this.pressedKeys.size > 0 || anyMouseHeld;

    if (hasActivity) {
      this.idleSeconds = 0;
    } else {
      this.idleSeconds += dt;
    }

    if (this.mouseActiveTimer > 0 && !anyMouseHeld) {
      this.mouseActiveTimer = Math.max(0, this.mouseActiveTimer - dt);
    }

    // Mouse suavizado
    const mouseAlpha = 1 - Math.exp(-20 * dt);
    this.mousePos.x = lerp(this.mousePos.x, this.mouseTarget.x, mouseAlpha);
    this.mousePos.y = lerp(this.mousePos.y, this.mouseTarget.y, mouseAlpha);

    // Transição de sono
    const timeout = Math.max(5, config.sleepTimeoutSec);
    if (!this.isSleeping && this.idleSeconds >= timeout) {
      this.isSleeping = true;
    }
    const targetSleep = this.isSleeping ? 1 : 0;
    const sleepRate = this.isSleeping ? 1.8 : 6.5;
    this.sleepBlend = lerp(this.sleepBlend, targetSleep, 1 - Math.exp(-sleepRate * dt));

    // Chacoalhada ao acordar
    if (this.wakeShakeTimer > 0) {
      this.wakeShakeTimer = Math.max(0, this.wakeShakeTimer - dt);
    }

    // Piscadas naturais quando acordado
    if (this.sleepBlend < 0.25) {
      if (this.isBlinking) {
        this.blinkProgress += dt / BLINK_DURATION_SEC;
        if (this.blinkProgress >= 1) {
          this.isBlinking = false;
          this.blinkProgress = 0;
          this.blinkTimer = 2.6 + ((Math.sin(this.tailPhase * 1.7) + 1) * 0.5) * 3.2;
        }
      } else {
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
          this.isBlinking = true;
          this.blinkProgress = 0;
        }
      }
    } else {
      this.isBlinking = false;
      this.blinkProgress = 0;
    }

    // Fases orgânicas (cauda e respiração)
    const awakeFactor = 1 - this.sleepBlend;
    this.tailPhase += dt * (1.85 * awakeFactor + 0.35);
    this.breathPhase += dt * (2.1 - 0.7 * this.sleepBlend);

    // Inclinação da cabeça e direção do olhar acompanhando o lado ativo
    let targetTilt = 0;
    let targetGazeX = 0;
    let targetGazeY = 0;

    if (this.isPawHoldingMouse()) {
      targetTilt -= 0.045;
      targetGazeX = (0.5 - this.mousePos.x) * 0.65 - 0.25;
      targetGazeY = (0.5 - this.mousePos.y) * 0.45 + 0.15;
    }
    if (this.activeLeftKey) {
      // Mão esquerda do gato (lado direito da tela)
      targetTilt += 0.04;
      targetGazeX += 0.28;
      targetGazeY += 0.2;
    } else if (this.activeRightKey) {
      // Mão direita do gato (lado esquerdo da tela)
      targetTilt -= 0.035;
      targetGazeX -= 0.15;
      targetGazeY += 0.2;
    }

    const headAlpha = 1 - Math.exp(-10 * dt);
    this.headTilt = lerp(this.headTilt, targetTilt * awakeFactor, headAlpha);
    this.gazeOffset.x = lerp(this.gazeOffset.x, targetGazeX * awakeFactor, headAlpha);
    this.gazeOffset.y = lerp(this.gazeOffset.y, targetGazeY * awakeFactor, headAlpha);
  }

  /**
   * Indica se a pata direita do gato (lado esquerdo da tela) deve segurar o mini mouse.
   * Permanece no mouse enquanto houver movimento recente ou botão pressionado.
   */
  isPawHoldingMouse(): boolean {
    return (
      this.mouseButtons.left ||
      this.mouseButtons.right ||
      this.mouseButtons.middle ||
      this.mouseActiveTimer > 0
    );
  }

  private transferRightPawToMouse(): void {
    if (this.activeRightKey !== null) {
      if (this.activeLeftKey === null) {
        this.activeLeftKey = this.activeRightKey;
      }
      this.activeRightKey = null;
    }
  }

  /**
   * Decide qual pata do gato (esquerda = direita da tela, direita = esquerda da tela)
   * alcança a tecla recém-pressionada.
   */
  private rebalancePaws(code: string, preferredHand: HandSide): void {
    if (this.isPawHoldingMouse()) {
      // Enquanto o mouse estiver ativo (movimento recente ou botão pressionado),
      // a pata direita permanece no mouse e a pata esquerda assume qualquer tecla.
      this.activeRightKey = null;
      this.activeLeftKey = code;
      return;
    }

    if (preferredHand === 'left') {
      this.activeLeftKey = code;
    } else {
      this.activeRightKey = code;
    }
  }

  private refreshActiveKeysAfterRelease(releasedCode: string): void {
    if (this.isPawHoldingMouse()) {
      this.activeRightKey = null;
      if (this.activeLeftKey === releasedCode) {
        this.activeLeftKey = this.findLatestPressedKey(null, null);
      }
      return;
    }

    if (this.activeLeftKey === releasedCode) {
      this.activeLeftKey = this.findLatestPressedKey('left', this.activeRightKey);
    }
    if (this.activeRightKey === releasedCode) {
      this.activeRightKey = this.findLatestPressedKey('right', this.activeLeftKey);
    }
  }

  private findLatestPressedKey(
    hand: HandSide | null,
    excludeCode: string | null,
  ): string | null {
    let bestCode: string | null = null;
    let bestSeq = -1;
    for (const [code, seq] of this.pressedKeys.entries()) {
      if (code === excludeCode) {
        continue;
      }
      const def = resolveVisualKey(code);
      if (!def) {
        continue;
      }
      if ((hand === null || def.hand === hand) && seq > bestSeq) {
        bestCode = code;
        bestSeq = seq;
      }
    }
    return bestCode;
  }
}
