import { describe, expect, it } from 'vitest';
import { YARN_BALL, isPointOnYarnBall } from '../src/renderer/rig/deskRenderer.ts';

describe('deskRenderer yarn ball close button', () => {
  it('detecta clique e hover dentro da bolinha de lã vermelha', () => {
    expect(isPointOnYarnBall(YARN_BALL.cx, YARN_BALL.cy)).toBe(true);
    expect(isPointOnYarnBall(YARN_BALL.cx + 8, YARN_BALL.cy - 6)).toBe(true);
  });

  it('ignora cliques fora da bolinha de lã (sobre o teclado ou mouse)', () => {
    expect(isPointOnYarnBall(274, 290)).toBe(false);
    expect(isPointOnYarnBall(138, 292)).toBe(false);
  });
});
