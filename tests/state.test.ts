import { describe, expect, it } from 'vitest';
import { CatStateMachine } from '../src/renderer/state.ts';
import { DEFAULT_CONFIG, type AppConfig } from '../src/shared/types.ts';

function advanceSeconds(state: CatStateMachine, seconds: number, config: AppConfig): void {
  const step = 0.05;
  const steps = Math.round(seconds / step);
  for (let i = 0; i < steps; i++) {
    state.tick(step, config);
  }
}

describe('CatStateMachine', () => {
  it('registra teclas pressionadas, aciona patas e libera corretamente', () => {
    const state = new CatStateMachine();
    const resA = state.applyInput({ type: 'key_down', code: 'KeyA' }, DEFAULT_CONFIG);
    expect(resA.triggeredKey).toBe('KeyA');
    expect(state.pressedKeys.has('KeyA')).toBe(true);
    expect(state.activeLeftKey).toBe('KeyA');

    const resL = state.applyInput({ type: 'key_down', code: 'KeyL' }, DEFAULT_CONFIG);
    expect(resL.triggeredKey).toBe('KeyL');
    expect(state.activeRightKey).toBe('KeyL');

    state.applyInput({ type: 'key_up', code: 'KeyA' }, DEFAULT_CONFIG);
    expect(state.pressedKeys.has('KeyA')).toBe(false);
    expect(state.activeLeftKey).toBeNull();
    expect(state.activeRightKey).toBe('KeyL');
  });

  it('suporta uso simultâneo de mouse e teclado mantendo a pata direita do gato no mouse', () => {
    const state = new CatStateMachine();

    state.applyInput({ type: 'mouse_down', button: 'left' }, DEFAULT_CONFIG);
    expect(state.isPawHoldingMouse()).toBe(true);

    // Pressionar WASD (mão esquerda do gato) enquanto segura o mouse usa naturalmente a pata esquerda
    state.applyInput({ type: 'key_down', code: 'KeyW' }, DEFAULT_CONFIG);
    expect(state.isPawHoldingMouse()).toBe(true);
    expect(state.activeRightKey).toBeNull();
    expect(state.activeLeftKey).toBe('KeyW');

    // Mesmo teclas da direita (KeyJ) são assumidas pela pata esquerda enquanto o botão do mouse estiver segurado
    state.applyInput({ type: 'key_down', code: 'KeyJ' }, DEFAULT_CONFIG);
    expect(state.isPawHoldingMouse()).toBe(true);
    expect(state.activeRightKey).toBeNull();
    expect(state.activeLeftKey).toBe('KeyJ');
  });

  it('não solta o mouse ao pressionar teclas do lado direito ou combos após mover o mouse', () => {
    const state = new CatStateMachine();

    // Move o mouse sem segurar nenhum botão
    state.applyInput({ type: 'mouse_move', x: 0.7, y: 0.4 }, DEFAULT_CONFIG);
    expect(state.isPawHoldingMouse()).toBe(true);

    // Pressiona tecla do lado do mouse (KeyJ / Enter / Space) -> pata esquerda digita, direita continua no mouse
    state.applyInput({ type: 'key_down', code: 'KeyJ' }, DEFAULT_CONFIG);
    expect(state.isPawHoldingMouse()).toBe(true);
    expect(state.activeRightKey).toBeNull();
    expect(state.activeLeftKey).toBe('KeyJ');

    // Combo W + Space com mouse ativo
    state.applyInput({ type: 'key_up', code: 'KeyJ' }, DEFAULT_CONFIG);
    state.applyInput({ type: 'key_down', code: 'KeyW' }, DEFAULT_CONFIG);
    state.applyInput({ type: 'key_down', code: 'Space' }, DEFAULT_CONFIG);
    expect(state.isPawHoldingMouse()).toBe(true);
    expect(state.activeRightKey).toBeNull();
    expect(state.activeLeftKey).toBe('Space');

    // Ao soltar Space mantendo KeyW pressionada, a pata esquerda volta para KeyW sem soltar o mouse
    state.applyInput({ type: 'key_up', code: 'Space' }, DEFAULT_CONFIG);
    expect(state.isPawHoldingMouse()).toBe(true);
    expect(state.activeRightKey).toBeNull();
    expect(state.activeLeftKey).toBe('KeyW');

    // Após expirar o tempo sem mexer no mouse (> 3.0s), volta à digitação normal com duas mãos
    state.applyInput({ type: 'key_up', code: 'KeyW' }, DEFAULT_CONFIG);
    advanceSeconds(state, 3.2, DEFAULT_CONFIG);
    expect(state.isPawHoldingMouse()).toBe(false);

    state.applyInput({ type: 'key_down', code: 'KeyJ' }, DEFAULT_CONFIG);
    expect(state.activeRightKey).toBe('KeyJ');
  });

  it('entra em modo sono após inatividade e desperta chacoalhando a cabeça', () => {
    const state = new CatStateMachine();
    const fastSleepConfig: AppConfig = { ...DEFAULT_CONFIG, sleepTimeoutSec: 5 };

    advanceSeconds(state, 6.5, fastSleepConfig);
    expect(state.isSleeping).toBe(true);
    expect(state.sleepBlend).toBeGreaterThan(0.85);

    const wakeResult = state.applyInput(
      { type: 'key_down', code: 'Space' },
      fastSleepConfig,
    );
    expect(wakeResult.wokeUp).toBe(true);
    expect(state.isSleeping).toBe(false);
    expect(state.wakeShakeTimer).toBeGreaterThan(0.3);
  });

  it('executa piscadas naturais durante o estado acordado', () => {
    const state = new CatStateMachine();
    let observedBlink = false;

    for (let i = 0; i < 120; i++) {
      state.tick(0.05, DEFAULT_CONFIG);
      if (state.blinkProgress > 0) {
        observedBlink = true;
        break;
      }
    }

    expect(observedBlink).toBe(true);
  });
});
