/**
 * Partículas suaves de "Zzz" flutuando acima da cabeça do gato quando adormecido.
 */

interface SleepGlyph {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  size: number;
  phase: number;
}

export class SleepParticles {
  private glyphs: SleepGlyph[] = [];
  private spawnCooldown = 0;

  update(dt: number, sleeping: boolean, originX: number, originY: number): void {
    if (sleeping) {
      this.spawnCooldown -= dt;
      if (this.spawnCooldown <= 0) {
        this.spawnCooldown = 0.85;
        this.glyphs.push({
          x: originX + (Math.random() - 0.5) * 14,
          y: originY,
          vx: 8 + Math.random() * 6,
          vy: -(20 + Math.random() * 8),
          age: 0,
          lifetime: 2.3,
          size: 13 + Math.random() * 5,
          phase: Math.random() * Math.PI * 2,
        });
      }
    } else {
      this.spawnCooldown = 0.2;
    }

    for (const glyph of this.glyphs) {
      glyph.age += dt;
      glyph.x += (glyph.vx + Math.sin(glyph.age * 3.2 + glyph.phase) * 9) * dt;
      glyph.y += glyph.vy * dt;
    }

    this.glyphs = this.glyphs.filter((g) => g.age < g.lifetime);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.glyphs.length === 0) {
      return;
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const glyph of this.glyphs) {
      const t = glyph.age / glyph.lifetime;
      const alpha = t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 0.8);
      const scale = 0.78 + t * 0.42;

      ctx.save();
      ctx.translate(glyph.x, glyph.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha * 0.92;
      ctx.font = `800 ${Math.round(glyph.size)}px "Segoe UI", system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20, 22, 28, 0.75)';
      ctx.strokeText('z', 0, 0);
      ctx.fillStyle = '#fff3cf';
      ctx.fillText('z', 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }
}
