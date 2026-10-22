/**
 * Tuning entities and validation rules.
 *
 * `order` is the display index from thickest to thinnest (0-based).
 * `stringNumber` is the conventional label shown to the user (guitar 6..1,
 * bass and ukulele 4..1).
 */

import { noteToMidi } from '../dsp/notes';

export type InstrumentFamily = 'guitar' | 'bass' | 'ukulele' | 'custom';
export type TuningMode = 'auto' | 'manual' | 'chromatic';

export const MIN_CUSTOM_STRINGS = 4;
export const MAX_CUSTOM_STRINGS = 8;

export interface TuningString {
  readonly order: number;
  readonly stringNumber: number;
  readonly note: string;
  readonly octave: number;
  readonly midi: number;
}

export interface TuningPreset {
  readonly id: string;
  readonly name: string;
  readonly family: InstrumentFamily;
  readonly builtIn: boolean;
  readonly strings: readonly TuningString[];
}

export interface ValidationIssue {
  readonly field: string;
  readonly message: string;
}

export function createString(
  order: number,
  stringNumber: number,
  note: string,
  octave: number,
): TuningString {
  return { order, stringNumber, note, octave, midi: noteToMidi(note, octave) };
}

export function validateStrings(strings: readonly TuningString[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (strings.length < MIN_CUSTOM_STRINGS || strings.length > MAX_CUSTOM_STRINGS) {
    issues.push({
      field: 'strings',
      message: `A tuning must have between ${MIN_CUSTOM_STRINGS} and ${MAX_CUSTOM_STRINGS} strings`,
    });
  }

  const orders = new Set<number>();
  const numbers = new Set<number>();

  for (const string of strings) {
    if (!Number.isInteger(string.order) || string.order < 0) {
      issues.push({ field: `strings[${string.order}].order`, message: 'String order must be a non-negative integer' });
    } else if (orders.has(string.order)) {
      issues.push({ field: `strings[${string.order}].order`, message: 'String order must be unique' });
    } else {
      orders.add(string.order);
    }

    if (!Number.isInteger(string.stringNumber) || string.stringNumber < 1) {
      issues.push({
        field: `strings[${string.order}].stringNumber`,
        message: 'String number must be a positive integer',
      });
    } else if (numbers.has(string.stringNumber)) {
      issues.push({
        field: `strings[${string.order}].stringNumber`,
        message: 'String number must be unique',
      });
    } else {
      numbers.add(string.stringNumber);
    }

    if (!Number.isInteger(string.midi) || string.midi < 0 || string.midi > 127) {
      issues.push({ field: `strings[${string.order}].midi`, message: 'MIDI note must be an integer from 0 to 127' });
      continue;
    }

    let expected: number;
    try {
      expected = noteToMidi(string.note, string.octave);
    } catch {
      issues.push({ field: `strings[${string.order}].note`, message: `Unknown note: ${string.note}` });
      continue;
    }
    if (expected !== string.midi) {
      issues.push({
        field: `strings[${string.order}].midi`,
        message: `MIDI ${string.midi} does not match ${string.note}${string.octave} (${expected})`,
      });
    }
  }

  const sorted = [...strings].sort((a, b) => a.order - b.order);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].midi <= sorted[i - 1].midi && sorted[i].note !== sorted[i - 1].note) {
      // Not an error on its own; ordering is by physical string, not pitch.
      continue;
    }
  }

  return issues;
}

export function validateTuning(tuning: TuningPreset): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!tuning.id || tuning.id.trim().length === 0) {
    issues.push({ field: 'id', message: 'Tuning id must not be empty' });
  }
  if (!tuning.name || tuning.name.trim().length === 0) {
    issues.push({ field: 'name', message: 'Tuning name must not be empty' });
  }
  if (tuning.name.trim().length > 40) {
    issues.push({ field: 'name', message: 'Tuning name must be 40 characters or fewer' });
  }

  issues.push(...validateStrings(tuning.strings));
  return issues;
}

/** Strings sorted by display order (thickest first). */
export function sortedStrings(tuning: TuningPreset): TuningString[] {
  return [...tuning.strings].sort((a, b) => a.order - b.order);
}

export function findStringByOrder(
  tuning: TuningPreset,
  order: number,
): TuningString | undefined {
  return tuning.strings.find((string) => string.order === order);
}
