import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Regression coverage for the runtime crash found in the browser:
 * `RangeError: Failed to execute 'setValueAtTime' on 'AudioParam': Time must be a
 * finite non-negative number: -0.1`.
 *
 * A freshly created AudioContext is suspended and reports `currentTime === 0`.
 * `playStartup()` schedules `playVocalTone` with `duration = 0.45`, and the
 * sustain point was computed as `startTime + duration - 0.55`, i.e. `-0.1`.
 * The Web Audio spec rejects negative times, so the whole jingle aborted.
 */

type RampCall = { value: number; time: number };

const buildParam = (initial: number, log: RampCall[]) => ({
  value: initial,
  setValueAtTime: (value: number, time: number) => {
    if (!Number.isFinite(time) || time < 0) {
      throw new RangeError(
        `Failed to execute 'setValueAtTime' on 'AudioParam': Time must be a finite non-negative number: ${time}`,
      );
    }
    log.push({ value, time });
  },
  linearRampToValueAtTime: (value: number, time: number) => {
    if (!Number.isFinite(time) || time < 0) {
      throw new RangeError(
        `Failed to execute 'linearRampToValueAtTime' on 'AudioParam': Time must be a finite non-negative number: ${time}`,
      );
    }
    log.push({ value, time });
  },
  exponentialRampToValueAtTime: (value: number, time: number) => {
    if (!Number.isFinite(time) || time < 0) {
      throw new RangeError(
        `Failed to execute 'exponentialRampToValueAtTime' on 'AudioParam': Time must be a finite non-negative number: ${time}`,
      );
    }
    if (value <= 0) {
      throw new RangeError(
        `Failed to execute 'exponentialRampToValueAtTime' on 'AudioParam': Value must be positive: ${value}`,
      );
    }
    log.push({ value, time });
  },
});

const buildContext = () => {
  const calls: RampCall[] = [];
  const node = () => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: '',
    frequency: buildParam(0, calls),
    detune: buildParam(0, calls),
    Q: buildParam(0, calls),
    gain: buildParam(1, calls),
  });

  let currentTime = 0;
  const ctx = {
    get currentTime() {
      return currentTime;
    },
    set currentTime(value: number) {
      currentTime = value;
    },
    state: 'suspended' as AudioContextState,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: () => node(),
    createGain: () => node(),
    createBiquadFilter: () => node(),
  };

  return { ctx, calls, setCurrentTime: (value: number) => { currentTime = value; } };
};

const installWindow = (ctx: unknown) => {
  Object.defineProperty(globalThis, 'window', {
    value: { AudioContext: vi.fn(() => ctx) },
    writable: true,
    configurable: true,
  });
};

const importService = async () => {
  const mod = await import('../../services/audioService');
  return mod.audioService;
};

describe('audioService scheduling', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('playStartup schedules every ramp at a non-negative time while the context is suspended (currentTime === 0)', async () => {
    const { ctx, calls } = buildContext();
    installWindow(ctx);

    const audioService = await importService();

    expect(() => audioService.playStartup()).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(Number.isFinite(call.time)).toBe(true);
      expect(call.time).toBeGreaterThanOrEqual(0);
    }
  });

  it('playStartup produces the full four-note motif plus the final echo', async () => {
    const { ctx, calls } = buildContext();
    installWindow(ctx);

    const audioService = await importService();
    audioService.playStartup();

    // 4 vocal notes x 2 oscillators + 1 ethereal note x 4 oscillators.
    const scheduled = calls.length;
    expect(scheduled).toBeGreaterThanOrEqual(4 * 2 + 4);
  });

  it('click, success, error and tour sounds never throw at currentTime === 0', async () => {
    const { ctx, calls } = buildContext();
    installWindow(ctx);

    const audioService = await importService();

    expect(() => audioService.playClick()).not.toThrow();
    expect(() => audioService.playSuccess()).not.toThrow();
    expect(() => audioService.playError()).not.toThrow();
    expect(() => audioService.playTourStep()).not.toThrow();

    for (const call of calls) {
      expect(call.time).toBeGreaterThanOrEqual(0);
    }
  });

  it('playStartup still schedules forward in time once the context is running', async () => {
    const { ctx, calls, setCurrentTime } = buildContext();
    installWindow(ctx);
    setCurrentTime(12.5);

    const audioService = await importService();
    expect(() => audioService.playStartup()).not.toThrow();

    for (const call of calls) {
      expect(call.time).toBeGreaterThanOrEqual(12.5);
    }
  });
});
