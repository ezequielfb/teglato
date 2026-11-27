/**
 * Partículas suaves do Teglato:
 * - `SleepParticles`: "z" flutuando enquanto o gato dorme
 * - `FloatingKeyParticles`: mini teclas subindo do teclado e sumindo suavemente ao digitar
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

interface FloatingKeycap {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  label: string;
}

const MAX_FLOATING_KEYS = 24;

/**
 * Gerencia mini teclas flutuantes que sobem a partir da tecla pressionada e somem suavemente.
 */
export class FloatingKeyParticles {
  private items: FloatingKeycap[] = [];

  get count(): number {
    return this.items.length;
  }

  /** Cria uma nova tecla flutuante na posição `(x, y)` do mini teclado. */
  spawn(x: number, y: number, label: string): void {
    if (this.items.length >= MAX_FLOATING_KEYS) {
      this.items.shift();
    }
    this.items.push({
      x,
      y: y - 4,
      vx: (Math.random() - 0.5) * 14,
      vy: -62,
      age: 0,
      lifetime: 0.78,
      label,
    });
  }

  /** Avança física leve de subida e remove teclas cujo ciclo terminou. */
  update(rawDt: number): void {
    const dt = Math.min(0.05, Math.max(0, rawDt));
    if (dt <= 0 || this.items.length === 0) {
      return;
    }

    const drag = Math.exp(-2.1 * dt);
    for (const item of this.items) {
      item.age += dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.vy *= drag;
      item.vx *= drag;
    }

    this.items = this.items.filter((item) => item.age < item.lifetime);
  }

  /** Renderiza cada tecla como uma mini keycap estilizada com fade-out suave. */
  render(ctx: CanvasRenderingContext2D): void {
    if (this.items.length === 0) {
      return;
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const item of this.items) {
      const t = Math.min(1, item.age / item.lifetime);
      const fadeIn = t < 0.12 ? t / 0.12 : 1;
      const fadeOut = 1 - Math.pow(t, 2.2);
      const alpha = fadeIn * fadeOut;
      const popScale =
        t < 0.18
          ? 0.75 + (t / 0.18) * 0.31
          : 1.06 - ((t - 0.18) / 0.82) * 0.14;

      const textLen = item.label.length;
      const width = textLen <= 1 ? 18 : Math.min(36, 12 + textLen * 5.6);
      const height = 16;
      const fontSize = textLen >= 4 ? 8.5 : 10;

      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(popScale, popScale);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Borda inferior 3D da mini tecla
      ctx.fillStyle = '#d4a22c';
      ctx.beginPath();
      ctx.roundRect(-width * 0.5, -height * 0.5 + 2.2, width, height, 4);
      ctx.fill();

      // Topo da mini tecla iluminado
      ctx.fillStyle = '#fff7dc';
      ctx.strokeStyle = '#24272e';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.roundRect(-width * 0.5, -height * 0.5, width, height, 4);
      ctx.fill();
      ctx.stroke();

      // Rótulo da tecla
      ctx.fillStyle = '#1c1e24';
      ctx.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillText(item.label, 0, 0.5);

      ctx.restore();
    }

    ctx.restore();
  }
}
