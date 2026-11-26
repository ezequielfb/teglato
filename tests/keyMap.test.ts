import { describe, expect, it } from 'vitest';
import {
  VISUAL_KEYS,
  computeKeyRects,
  resolveVisualKey,
} from '../src/shared/keyMap.ts';

describe('keyMap', () => {
  it('possui exatamente as 63 teclas do layout compacto original', () => {
    expect(VISUAL_KEYS).toHaveLength(63);
    const uniqueCodes = new Set(VISUAL_KEYS.map((k) => k.code));
    expect(uniqueCodes.size).toBe(63);
  });

  it('mapeia teclas ABNT2, numpad e teclas de função para equivalentes visuais', () => {
    expect(resolveVisualKey('IntlRo')?.code).toBe('Slash');
    expect(resolveVisualKey('IntlBackslash')?.code).toBe('ShiftLeft');
    expect(resolveVisualKey('NumpadEnter')?.code).toBe('Enter');
    expect(resolveVisualKey('Numpad5')?.code).toBe('Digit5');
    expect(resolveVisualKey('F12')?.code).toBe('Equal');
    expect(resolveVisualKey('Delete')?.code).toBe('Backspace');
  });

  it('retorna null para códigos desconhecidos sem lançar erro', () => {
    expect(resolveVisualKey('NonExistentKey')).toBeNull();
  });

  it('calcula polígonos em perspectiva válidos para todas as 63 teclas', () => {
    const rects = computeKeyRects({
      topCenterX: 274,
      topY: 270,
      topWidth: 184,
      bottomWidth: 204,
      height: 46,
    });

    expect(rects.size).toBe(63);
    const q = rects.get('KeyQ')!;
    const p = rects.get('KeyP')!;
    const space = rects.get('Space')!;

    expect(q.cx).toBeLessThan(p.cx);
    expect(q.cy).toBeLessThan(space.cy);
    expect(q.hand).toBe('left');
    expect(p.hand).toBe('right');
  });
});
