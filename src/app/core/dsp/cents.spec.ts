import { describe, expect, it } from 'vitest';
import {
  centsFromNearestNote,
  hzFromMidi,
  isInDetectionRange,
  MAX_REFERENCE_HZ,
  midiFromHz,
  MIN_REFERENCE_HZ,
  offsetCents,
} from './cents';

describe('cents and frequency conversion', () => {
  it('maps A4 to its reference frequency', () => {
    expect(hzFromMidi(69, 440)).toBeCloseTo(440, 9);
    expect(offsetCents(440, 440)).toBeCloseTo(0, 9);
  });

  it('treats an octave as 1200 cents', () => {
    expect(offsetCents(880, 440)).toBeCloseTo(1200, 9);
    expect(offsetCents(220, 440)).toBeCloseTo(-1200, 9);
  });

  it('tracks a non-440 reference', () => {
    expect(hzFromMidi(69, 432)).toBeCloseTo(432, 9);
    expect(offsetCents(hzFromMidi(70, 440), 440)).toBeCloseTo(100, 6);
  });

  it('reports sharp readings as positive and flat readings as negative', () => {
    const e2 = hzFromMidi(40, 440);
    expect(offsetCents(90, e2)).toBeCloseTo(152.6, 1);
    expect(offsetCents(75.3, e2)).toBeCloseTo(-156.1, 1);
  });

  it('round-trips MIDI through hertz', () => {
    for (const midi of [28, 40, 45, 69, 88]) {
      const hz = hzFromMidi(midi, 440);
      expect(midiFromHz(hz, 440)).toBeCloseTo(midi, 9);
    }
  });

  it('keeps nearest-note offsets inside plus or minus 50 cents', () => {
    for (const hz of [41, 82.41, 110, 261.63, 440, 987.77]) {
      const cents = centsFromNearestNote(hz, 440);
      expect(cents).toBeGreaterThanOrEqual(-50);
      expect(cents).toBeLessThanOrEqual(50);
    }
  });

  it('guards the supported detection range', () => {
    expect(isInDetectionRange(40)).toBe(true);
    expect(isInDetectionRange(1000)).toBe(true);
    expect(isInDetectionRange(39.99)).toBe(false);
    expect(isInDetectionRange(1000.01)).toBe(false);
    expect(MIN_REFERENCE_HZ).toBe(415);
    expect(MAX_REFERENCE_HZ).toBe(466);
  });
});
