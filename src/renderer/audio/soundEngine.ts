import type { AudioConfig } from '../../shared/types.ts';

/**
 * Motor de áudio opcional sintetizado via Web Audio API.
 * Gera cliques suaves de teclado/mouse e ronronar sutil ao dormir, sem arquivos externos.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private purrOsc: OscillatorNode | null = null;
  private purrLfo: OscillatorNode | null = null;
  private purrFilter: BiquadFilterNode | null = null;
  private purrTremolo: GainNode | null = null;
  private purrLfoDepth: GainNode | null = null;
  private purrGain: GainNode | null = null;
  private purrStopTimer: ReturnType<typeof setTimeout> | null = null;
  private purrActive = false;

  private ensureContext(): AudioContext | null {
    const AudioCtor =
      typeof globalThis !== 'undefined'
        ? ((globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
          (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined;
    if (!AudioCtor) {
      return null;
    }
    if (!this.ctx) {
      this.ctx = new AudioCtor();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private ensureNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /** Reproduz um toque suave de tecla mecânica com leve variação tonal. */
  playKeyTap(audio: AudioConfig): void {
    if (!audio.enabled || audio.keyVolume <= 0.01) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    const now = ctx.currentTime;
    const vol = Math.min(1, audio.keyVolume) * 0.24;
    const jitter = 0.92 + Math.random() * 0.16;

    // Corpo grave sutil ("thock")
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(195 * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(75 * jitter, now + 0.032);
    oscGain.gain.setValueAtTime(vol, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.042);

    // Transiente de clique filtrado
    const noise = ctx.createBufferSource();
    noise.buffer = this.ensureNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1850 * jitter, now);
    filter.Q.setValueAtTime(1.4, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.025);
  }

  /** Reproduz um clique curto de micro-switch do mouse. */
  playMouseClick(audio: AudioConfig): void {
    if (!audio.enabled || audio.mouseVolume <= 0.01) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    const now = ctx.currentTime;
    const vol = Math.min(1, audio.mouseVolume) * 0.22;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.02);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.028);
  }

  /** Para imediatamente ou suavemente o ronronar e desliga os osciladores ativos. */
  stopPurr(immediate = false): void {
    if (!this.purrActive && !this.purrOsc) {
      return;
    }
    this.purrActive = false;

    if (this.purrStopTimer !== null) {
      clearTimeout(this.purrStopTimer);
      this.purrStopTimer = null;
    }

    const fadeSec = immediate ? 0.04 : 0.1;
    if (this.purrGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.purrGain.gain.cancelScheduledValues(now);
      this.purrGain.gain.setValueAtTime(this.purrGain.gain.value, now);
      this.purrGain.gain.linearRampToValueAtTime(0, now + fadeSec);
    }

    const cleanupMs = Math.round(fadeSec * 1000) + 25;
    this.purrStopTimer = setTimeout(() => {
      this.purrStopTimer = null;
      if (!this.purrActive) {
        this.teardownPurrNodes();
      }
    }, cleanupMs);
  }

  /** Mantém o ronronar contínuo suave enquanto dormindo e silencia por completo ao acordar. */
  updatePurr(isSleeping: boolean, audio: AudioConfig): void {
    const shouldPlay = audio.enabled && isSleeping && audio.purrVolume > 0.01;
    if (!shouldPlay) {
      this.stopPurr();
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    if (this.purrStopTimer !== null) {
      clearTimeout(this.purrStopTimer);
      this.purrStopTimer = null;
    }

    if (!this.purrOsc || !this.purrGain || !this.purrLfo) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(27, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(115, ctx.currentTime);

      // Tremolo em estágio separado para que o ganho mestre possa zerar completamente ao acordar
      const tremoloGain = ctx.createGain();
      tremoloGain.gain.setValueAtTime(1.0, ctx.currentTime);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.45, ctx.currentTime);
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.setValueAtTime(0.35, ctx.currentTime);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);

      osc.connect(filter);
      filter.connect(tremoloGain);
      lfo.connect(lfoDepth);
      lfoDepth.connect(tremoloGain.gain);
      tremoloGain.connect(masterGain);
      masterGain.connect(ctx.destination);

      osc.start();
      lfo.start();

      this.purrOsc = osc;
      this.purrLfo = lfo;
      this.purrFilter = filter;
      this.purrTremolo = tremoloGain;
      this.purrLfoDepth = lfoDepth;
      this.purrGain = masterGain;
    }

    this.purrActive = true;
    const now = ctx.currentTime;
    const targetVol = Math.min(1, audio.purrVolume) * 0.055;
    this.purrGain.gain.cancelScheduledValues(now);
    this.purrGain.gain.setTargetAtTime(targetVol, now, 0.35);
  }

  private teardownPurrNodes(): void {
    try {
      this.purrOsc?.stop();
      this.purrLfo?.stop();
      this.purrOsc?.disconnect();
      this.purrLfo?.disconnect();
      this.purrFilter?.disconnect();
      this.purrTremolo?.disconnect();
      this.purrLfoDepth?.disconnect();
      this.purrGain?.disconnect();
    } catch {
      // Ignora caso os nós já tenham sido finalizados.
    }
    this.purrOsc = null;
    this.purrLfo = null;
    this.purrFilter = null;
    this.purrTremolo = null;
    this.purrLfoDepth = null;
    this.purrGain = null;
  }

  dispose(): void {
    if (this.purrStopTimer !== null) {
      clearTimeout(this.purrStopTimer);
      this.purrStopTimer = null;
    }
    this.purrActive = false;
    this.teardownPurrNodes();
    try {
      void this.ctx?.close();
    } catch {
      // Ignora erro caso o contexto já tenha sido encerrado.
    }
    this.ctx = null;
  }
}
