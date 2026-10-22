import { describe, expect, it } from 'vitest';
import { ChromaticSelector, nearestNote } from './chromatic-selector';

describe('chromatic selection', () => {
  it('names A4 at 440 Hz', () => {
    const note = nearestNote(440, 440);
    expect(note.note).toBe('A');
    expect(note.octave).toBe(4);
    expect(note.distanceCents).toBeCloseTo(0, 6);
  });

  it('picks the higher note on an exact tie', () => {
    const halfway = 440 * Math.pow(2, 0.5 / 12);
    const note = nearestNote(halfway, 440);
    expect(note.note).toBe('A#');
    expect(note.octave).toBe(4);
  });

  it('honours a 432 Hz reference', () => {
    const note = nearestNote(432, 432);
    expect(note.note).toBe('A');
    expect(note.targetHz).toBeCloseTo(432, 9);
  });

  it('holds the current note until the new note is 8 cents closer', () => {
    const selector = new ChromaticSelector();
    selector.update(440, 440);

    const halfway = 440 * Math.pow(2, 0.5 / 12);
    const held = selector.update(halfway, 440);
    expect(held.note).toBe('A');

    const switched = selector.update(460, 440);
    expect(switched.note).toBe('A#');
  });

  it('does not apply hysteresis across an octave jump', () => {
    const selector = new ChromaticSelector();
    selector.update(440, 440);
    const high = selector.update(880, 440);
    expect(high.note).toBe('A');
    expect(high.octave).toBe(5);
  });

  it('resets to no current note', () => {
    const selector = new ChromaticSelector();
    selector.update(440, 440);
    selector.reset();
    const note = selector.update(261.63, 440);
    expect(note.note).toBe('C');
    expect(note.octave).toBe(4);
  });
});
