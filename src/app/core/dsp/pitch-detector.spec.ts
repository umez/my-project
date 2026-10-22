import { describe, expect, it } from 'vitest';
import { offsetCents } from './cents';
import { analyzeFrame, rmsDbOf } from './pitch-detector';

const SAMPLE_RATE = 48_000;
const FRAME = 4096;

function sine(frequency: number, sampleRate = SAMPLE_RATE, length = FRAME, amplitude = 0.3): Float32Array {
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return samples;
}

function plucked(fundamental: number, harmonics: readonly number[], length = FRAME): Float32Array {
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let value = 0;
    harmonics.forEach((amplitude, index) => {
      const harmonic = index + 1;
      const decay = Math.exp(-i / (length * 0.9));
      value += amplitude * Math.sin((2 * Math.PI * fundamental * harmonic * i) / SAMPLE_RATE) * decay;
    });
    samples[i] = value * 0.3;
  }
  return samples;
}

function randomSamples(length = FRAME, seed = 12345): Float32Array {
  let state = seed >>> 0;
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    samples[i] = ((state / 0xffffffff) * 2 - 1) * 0.5;
  }
  return samples;
}

describe('analyzeFrame', () => {
  const guitarStrings = [82.4069, 110, 146.832, 195.998, 246.942, 329.628];

  it.each(guitarStrings)('detects %f Hz within one cent', (frequency) => {
    const result = analyzeFrame(sine(frequency), SAMPLE_RATE);
    expect(result).not.toBeNull();
    expect(Math.abs(offsetCents(result!.frequencyHz, frequency))).toBeLessThanOrEqual(1);
    expect(result!.clarity).toBeGreaterThanOrEqual(0.85);
  });

  it.each([41.2034, 55, 440, 659.2551, 987.7666])(
    'covers the wider range at %f Hz',
    (frequency) => {
      const result = analyzeFrame(sine(frequency), SAMPLE_RATE);
      expect(result).not.toBeNull();
      expect(Math.abs(offsetCents(result!.frequencyHz, frequency))).toBeLessThanOrEqual(1);
    },
  );

  it('works at 44.1 kHz', () => {
    const result = analyzeFrame(sine(196, 44_100), 44_100);
    expect(result).not.toBeNull();
    expect(Math.abs(offsetCents(result!.frequencyHz, 196))).toBeLessThanOrEqual(1);
  });

  it('keeps the fundamental when a higher harmonic dominates', () => {
    const result = analyzeFrame(plucked(82.4069, [0.35, 0.9, 0.4, 0.25]), SAMPLE_RATE);
    expect(result).not.toBeNull();
    expect(Math.abs(offsetCents(result!.frequencyHz, 82.4069))).toBeLessThanOrEqual(2);
  });

  it('does not report an octave below the fundamental', () => {
    const result = analyzeFrame(sine(329.628), SAMPLE_RATE);
    expect(result).not.toBeNull();
    expect(result!.frequencyHz).toBeGreaterThan(300);
  });

  it('returns null for silence', () => {
    expect(analyzeFrame(new Float32Array(FRAME), SAMPLE_RATE)).toBeNull();
  });

  it('returns null for a very quiet signal', () => {
    expect(analyzeFrame(sine(196, SAMPLE_RATE, FRAME, 0.0005), SAMPLE_RATE)).toBeNull();
  });

  it('returns null for white noise', () => {
    expect(analyzeFrame(randomSamples(), SAMPLE_RATE)).toBeNull();
  });

  it('returns null for a frame that is too short', () => {
    expect(analyzeFrame(new Float32Array(32), SAMPLE_RATE)).toBeNull();
  });

  it('ignores non-finite samples', () => {
    const samples = sine(110);
    samples[0] = Number.NaN;
    samples[1] = Number.POSITIVE_INFINITY;
    const result = analyzeFrame(samples, SAMPLE_RATE);
    expect(result).not.toBeNull();
    expect(Math.abs(offsetCents(result!.frequencyHz, 110))).toBeLessThanOrEqual(1);
  });
});

describe('rmsDbOf', () => {
  it('reports 0 dBFS for a full-scale square wave', () => {
    expect(rmsDbOf(new Float32Array([1, -1, 1, -1]))).toBeCloseTo(0, 6);
  });

  it('reports a floor for silence instead of negative infinity', () => {
    expect(Number.isFinite(rmsDbOf(new Float32Array(16)))).toBe(true);
  });
});
