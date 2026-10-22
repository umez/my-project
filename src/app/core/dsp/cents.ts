/**
 * Frequency, MIDI, and cent conversions.
 *
 * Every pitch comparison in the application happens in the logarithmic domain so
 * that intervals stay uniform across the supported range. Never compare hertz
 * values directly when selecting a target.
 */

export const A4_MIDI = 69;
export const MIN_FREQUENCY_HZ = 40;
export const MAX_FREQUENCY_HZ = 1000;
export const MIN_REFERENCE_HZ = 415;
export const MAX_REFERENCE_HZ = 466;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Fractional MIDI number for a frequency, relative to the configured A4. */
export function midiFromHz(frequencyHz: number, referenceHz: number): number {
  return A4_MIDI + 12 * Math.log2(frequencyHz / referenceHz);
}

/** Frequency for a (possibly fractional) MIDI number. */
export function hzFromMidi(midi: number, referenceHz: number): number {
  return referenceHz * Math.pow(2, (midi - A4_MIDI) / 12);
}

/** Signed cent offset of a frequency against a target: positive means sharp. */
export function offsetCents(frequencyHz: number, targetHz: number): number {
  return 1200 * Math.log2(frequencyHz / targetHz);
}

/** Signed cent offset from the nearest equal-tempered note. Range: -50..50. */
export function centsFromNearestNote(frequencyHz: number, referenceHz: number): number {
  const midi = midiFromHz(frequencyHz, referenceHz);
  return 100 * (midi - Math.round(midi));
}

/** True when the frequency is inside the detectable range (inclusive). */
export function isInDetectionRange(frequencyHz: number): boolean {
  return (
    Number.isFinite(frequencyHz) &&
    frequencyHz >= MIN_FREQUENCY_HZ &&
    frequencyHz <= MAX_FREQUENCY_HZ
  );
}

/** Round to a fixed number of decimals without floating-point noise. */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
