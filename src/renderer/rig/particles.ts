/**
 * Partículas suaves do Teglato:
 * - `SleepParticles`: "z" flutuando enquanto o gato dorme
 * - `FloatingKeyParticles`: mini teclas subindo do teclado e sumindo suavemente ao digitar
 */

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

export interface FloatingKeycapSnapshot {
  x: number;
  y: number;
  age: number;
  lifetime: number;
  label: string;
}

interface FloatingKeycap extends FloatingKeycapSnapshot {
  vx: number;
  vy: number;
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

  /** Retorna um snapshot somente-leitura das teclas ativas (usado em testes). */
  getSnapshot(): readonly FloatingKeycapSnapshot[] {
    return this.items.map(({ x, y, age, lifetime, label }) => ({
      x,
      y,
      age,
      lifetime,
      label,
    }));
  }

  /** Cria uma nova tecla flutuante acima da coordenada `(x, y)` do mini teclado. */
  spawn(x: number, y: number, label: string): void {
    if (this.items.length >= MAX_FLOATING_KEYS) {
      this.items.shift();
    }
    this.items.push({
      x,
      y: y - 12,
      vx: (Math.random() - 0.5) * 16,
      vy: -128,
      age: 0,
      lifetime: 1.05,
      label,
    });
  }

  /** Avança física leve de subida e remove teclas cujo ciclo terminou. */
  update(rawDt: number): void {
    const dt = Math.min(0.05, Math.max(0, rawDt));
    if (dt <= 0 || this.items.length === 0) {
      return;
    }

    const drag = Math.exp(-1.15 * dt);
    for (const item of this.items) {
      item.age += dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.vy *= drag;
      item.vx *= drag;
    }

    this.items = this.items.filter((item) => item.age < item.lifetime);
  }

  /** Renderiza cada tecla como uma mini keycap 3D legível subindo e sumindo suavemente. */
  render(ctx: CanvasRenderingContext2D): void {
    if (this.items.length === 0) {
      return;
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const item of this.items) {
      const t = Math.min(1, item.age / item.lifetime);
      const fadeIn = t < 0.08 ? t / 0.08 : 1;
      const fadeOut = t < 0.52 ? 1 : Math.max(0, 1 - Math.pow((t - 0.52) / 0.48, 1.6));
      const alpha = fadeIn * fadeOut;
      const popScale =
        t < 0.14
          ? 0.72 + (t / 0.14) * 0.36
          : 1.08 - ((t - 0.14) / 0.86) * 0.14;

      const textLen = item.label.length;
      const width = textLen <= 1 ? 26 : Math.min(48, 16 + textLen * 7.5);
      const height = 24;
      const fontSize = textLen >= 4 ? 11 : 13;

      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(popScale, popScale);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Sombra projetada suave para destacar sobre a mesa e o gato
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      drawRoundedRect(ctx, -width * 0.5, -height * 0.5 + 4.5, width, height, 6);
      ctx.fill();

      // Borda inferior 3D da mini keycap
      ctx.fillStyle = '#c99320';
      drawRoundedRect(ctx, -width * 0.5, -height * 0.5 + 2.8, width, height, 5.5);
      ctx.fill();

      // Topo da mini keycap iluminado
      ctx.fillStyle = '#fff8e1';
      ctx.strokeStyle = '#1c1e24';
      ctx.lineWidth = 1.8;
      drawRoundedRect(ctx, -width * 0.5, -height * 0.5, width, height, 5.5);
      ctx.fill();
      ctx.stroke();

      // Rótulo nítido da tecla
      ctx.fillStyle = '#181a20';
      ctx.font = `800 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillText(item.label, 0, 0.5);

      ctx.restore();
    }

    ctx.restore();
  }
}
