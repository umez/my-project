import { describe, expect, it } from 'vitest';
import { formatMidi, midiToNote, normalizeNoteName, noteToMidi, pitchClassOf } from './notes';

describe('note naming', () => {
  it('uses C4 = 60 and A4 = 69', () => {
    expect(noteToMidi('C', 4)).toBe(60);
    expect(noteToMidi('A', 4)).toBe(69);
  });

  it('parses sharps and flats', () => {
    expect(noteToMidi('F#', 3)).toBe(54);
    expect(noteToMidi('Gb', 3)).toBe(54);
    expect(noteToMidi('Eb', 2)).toBe(39);
    expect(noteToMidi('Bb', 3)).toBe(58);
  });

  it('rejects unknown spellings', () => {
    expect(() => pitchClassOf('H')).toThrow();
    expect(() => pitchClassOf('C##')).toThrow();
  });

  it('formats MIDI as sharp note names with octaves', () => {
    expect(formatMidi(69)).toBe('A4');
    expect(formatMidi(61)).toBe('C#4');
    expect(formatMidi(40)).toBe('E2');
    expect(midiToNote(28)).toEqual({ midi: 28, note: 'E', octave: 1 });
  });

  it('normalizes flats to sharps for display', () => {
    expect(normalizeNoteName('Eb')).toBe('D#');
    expect(normalizeNoteName('C#')).toBe('C#');
  });
});
