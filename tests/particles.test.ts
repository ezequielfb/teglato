import { describe, expect, it } from 'vitest';
import { FloatingKeyParticles } from '../src/renderer/rig/particles.ts';

describe('FloatingKeyParticles', () => {
  it('cria a tecla, sobe suavemente e desaparece após o tempo de vida', () => {
    const particles = new FloatingKeyParticles();
    particles.spawn(240, 280, 'A');
    expect(particles.count).toBe(1);

    const initialY = particles.getSnapshot()[0].y;

    // Avança 0.5s: subiu bastante acima do teclado e ainda está visível
    for (let i = 0; i < 10; i++) {
      particles.update(0.05);
    }
    expect(particles.count).toBe(1);
    const risenY = particles.getSnapshot()[0].y;
    expect(initialY - risenY).toBeGreaterThan(40);

    // Avança até completar o ciclo (> 1.05s): remove automaticamente
    for (let i = 0; i < 14; i++) {
      particles.update(0.05);
    }
    expect(particles.count).toBe(0);
  });

  it('limita o máximo de partículas simultâneas para manter 60 FPS leves', () => {
    const particles = new FloatingKeyParticles();
    for (let i = 0; i < 40; i++) {
      particles.spawn(200 + i, 280, 'K');
    }
    expect(particles.count).toBe(24);
  });
});
