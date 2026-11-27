import { afterEach, describe, expect, it, vi } from 'vitest';
import { SoundEngine } from '../src/renderer/audio/soundEngine.ts';
import type { AudioConfig } from '../src/shared/types.ts';

function createMockAudioContext() {
  const createdGains: Array<{
    gain: {
      value: number;
      setValueAtTime: ReturnType<typeof vi.fn>;
      setTargetAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      cancelScheduledValues: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];

  const createdOscs: Array<{
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];

  class MockAudioContext {
    currentTime = 1.0;
    sampleRate = 44100;
    state = 'running';
    destination = {};

    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);

    createGain() {
      const node = {
        gain: {
          value: 0,
          setValueAtTime: vi.fn((val: number) => {
            node.gain.value = val;
          }),
          setTargetAtTime: vi.fn((val: number) => {
            node.gain.value = val;
          }),
          linearRampToValueAtTime: vi.fn((val: number) => {
            node.gain.value = val;
          }),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      createdGains.push(node);
      return node;
    }

    createOscillator() {
      const osc = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      createdOscs.push(osc);
      return osc;
    }

    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: { setValueAtTime: vi.fn() },
        Q: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }

    createBuffer() {
      return {
        sampleRate: 44100,
        getChannelData: () => new Float32Array(100),
      };
    }

    createBufferSource() {
      return {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
  }

  return { MockAudioContext, createdGains, createdOscs };
}

describe('SoundEngine purr lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>).AudioContext;
  });

  it('inicia o ronronar ao dormir e desliga completamente os osciladores ao acordar', () => {
    vi.useFakeTimers();
    const { MockAudioContext, createdGains, createdOscs } = createMockAudioContext();
    (globalThis as Record<string, unknown>).AudioContext = MockAudioContext;

    const engine = new SoundEngine();
    const audio: AudioConfig = {
      enabled: true,
      keyVolume: 0.35,
      mouseVolume: 0.3,
      purrVolume: 0.5,
    };

    // Dormindo: cria osciladores e eleva masterGain
    engine.updatePurr(true, audio);
    expect(createdOscs).toHaveLength(2);
    expect(createdOscs[0].start).toHaveBeenCalledTimes(1);
    expect(createdOscs[1].start).toHaveBeenCalledTimes(1);

    const tremoloGain = createdGains[0];
    const lfoDepthGain = createdGains[1];
    const masterGain = createdGains[2];
    // LFO modula o estágio de tremolo, nunca o masterGain diretamente
    expect(lfoDepthGain.connect).toHaveBeenCalledWith(tremoloGain.gain);
    expect(masterGain.gain.setTargetAtTime).toHaveBeenCalled();

    // Acordou: zera masterGain e após o fade interrompe/desconecta os osciladores
    engine.stopPurr(true);
    expect(masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1.04);

    vi.advanceTimersByTime(100);
    expect(createdOscs[0].stop).toHaveBeenCalledTimes(1);
    expect(createdOscs[1].stop).toHaveBeenCalledTimes(1);
    expect(masterGain.disconnect).toHaveBeenCalledTimes(1);

    engine.dispose();
  });
});
