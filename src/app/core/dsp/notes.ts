/**
 * Note naming and MIDI conversion.
 *
 * Chromatic mode uses sharp spellings. Presets keep their authored spelling
 * (for example "F#", "G#", "Eb") for display, while `midi` is the source of
 * truth for all calculations.
 */

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

const FLAT_TO_SHARP: Record<string, NoteName> = {
  Cb: 'B',
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

const NATURAL_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export interface NoteInfo {
  readonly midi: number;
  readonly note: string;
  readonly octave: number;
}

/** Parse a note name such as "C", "F#", "Bb" into a pitch class 0..11. */
export function pitchClassOf(note: string): number {
  const trimmed = note.trim();
  const natural = trimmed.charAt(0).toUpperCase();
  const base = NATURAL_SEMITONES[natural];
  if (base === undefined) {
    throw new Error(`Unknown note name: ${note}`);
  }
  const accidental = trimmed.slice(1);
  if (accidental === '') {
    return base;
  }
  if (accidental === '#') {
    return (base + 1) % 12;
  }
  if (accidental === 'b') {
    return (base + 11) % 12;
  }
  throw new Error(`Unknown accidental in note: ${note}`);
}

/** MIDI number for an explicit note and octave (C4 = 60). */
export function noteToMidi(note: string, octave: number): number {
  return 12 * (octave + 1) + pitchClassOf(note);
}

/** Canonical sharp name for any MIDI number, including the octave. */
export function midiToNote(midi: number): NoteInfo {
  const rounded = Math.round(midi);
  const pitchClass = ((rounded % 12) + 12) % 12;
  return {
    midi: rounded,
    note: NOTE_NAMES[pitchClass],
    octave: Math.floor(rounded / 12) - 1,
  };
}

/** Format a MIDI number as "A2", "F#3", and so on. */
export function formatMidi(midi: number): string {
  const info = midiToNote(midi);
  return `${info.note}${info.octave}`;
}

/** Convert an authored spelling (including flats) to its sharp equivalent. */
export function normalizeNoteName(note: string): NoteName {
  const trimmed = note.trim();
  const flat = FLAT_TO_SHARP[trimmed];
  if (flat) {
    return flat;
  }
  const pitchClass = pitchClassOf(trimmed);
  return NOTE_NAMES[pitchClass];
}
