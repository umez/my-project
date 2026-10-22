/**
 * Built-in tuning presets.
 *
 * Strings are listed thickest-first in conventional numbering: guitar 6..1,
 * bass and ukulele 4..1. Ukulele is reentrant, so G4 is the first string even
 * though it sounds above C4.
 */

import { createString, type InstrumentFamily, type TuningPreset } from './tuning-model';

type StringSpec = readonly [note: string, octave: number, stringNumber: number];

function preset(
  id: string,
  name: string,
  family: InstrumentFamily,
  specs: readonly StringSpec[],
): TuningPreset {
  return {
    id,
    name,
    family,
    builtIn: true,
    strings: specs.map(([note, octave, stringNumber], order) =>
      createString(order, stringNumber, note, octave),
    ),
  };
}

export const GUITAR_STANDARD = preset('guitar-standard', 'Standard', 'guitar', [
  ['E', 2, 6],
  ['A', 2, 5],
  ['D', 3, 4],
  ['G', 3, 3],
  ['B', 3, 2],
  ['E', 4, 1],
]);

export const GUITAR_DROP_D = preset('guitar-drop-d', 'Drop D', 'guitar', [
  ['D', 2, 6],
  ['A', 2, 5],
  ['D', 3, 4],
  ['G', 3, 3],
  ['B', 3, 2],
  ['E', 4, 1],
]);

export const GUITAR_DOUBLE_DROP_D = preset(
  'guitar-double-drop-d',
  'Double Drop D',
  'guitar',
  [
    ['D', 2, 6],
    ['A', 2, 5],
    ['D', 3, 4],
    ['G', 3, 3],
    ['B', 3, 2],
    ['D', 4, 1],
  ],
);

export const GUITAR_OPEN_G = preset('guitar-open-g', 'Open G', 'guitar', [
  ['D', 2, 6],
  ['G', 2, 5],
  ['D', 3, 4],
  ['G', 3, 3],
  ['B', 3, 2],
  ['D', 4, 1],
]);

export const GUITAR_OPEN_D = preset('guitar-open-d', 'Open D', 'guitar', [
  ['D', 2, 6],
  ['A', 2, 5],
  ['D', 3, 4],
  ['F#', 3, 3],
  ['A', 3, 2],
  ['D', 4, 1],
]);

export const GUITAR_OPEN_E = preset('guitar-open-e', 'Open E', 'guitar', [
  ['E', 2, 6],
  ['B', 2, 5],
  ['E', 3, 4],
  ['G#', 3, 3],
  ['B', 3, 2],
  ['E', 4, 1],
]);

export const GUITAR_DADGAD = preset('guitar-dadgad', 'DADGAD', 'guitar', [
  ['D', 2, 6],
  ['A', 2, 5],
  ['D', 3, 4],
  ['G', 3, 3],
  ['A', 3, 2],
  ['D', 4, 1],
]);

export const GUITAR_HALF_STEP_DOWN = preset(
  'guitar-half-step-down',
  'Half-step down (Eb)',
  'guitar',
  [
    ['Eb', 2, 6],
    ['Ab', 2, 5],
    ['Db', 3, 4],
    ['Gb', 3, 3],
    ['Bb', 3, 2],
    ['Eb', 4, 1],
  ],
);

export const GUITAR_FULL_STEP_DOWN = preset(
  'guitar-full-step-down',
  'Full-step down (D)',
  'guitar',
  [
    ['D', 2, 6],
    ['G', 2, 5],
    ['C', 3, 4],
    ['F', 3, 3],
    ['A', 3, 2],
    ['D', 4, 1],
  ],
);

export const BASS_4 = preset('bass-4', 'Bass (4-string)', 'bass', [
  ['E', 1, 4],
  ['A', 1, 3],
  ['D', 2, 2],
  ['G', 2, 1],
]);

export const UKULELE = preset('ukulele', 'Ukulele', 'ukulele', [
  ['G', 4, 4],
  ['C', 4, 3],
  ['E', 4, 2],
  ['A', 4, 1],
]);

export const GUITAR_PRESETS: readonly TuningPreset[] = [
  GUITAR_STANDARD,
  GUITAR_DROP_D,
  GUITAR_DOUBLE_DROP_D,
  GUITAR_OPEN_G,
  GUITAR_OPEN_D,
  GUITAR_OPEN_E,
  GUITAR_DADGAD,
  GUITAR_HALF_STEP_DOWN,
  GUITAR_FULL_STEP_DOWN,
];

export const BASS_PRESETS: readonly TuningPreset[] = [BASS_4];

export const UKULELE_PRESETS: readonly TuningPreset[] = [UKULELE];

export const ALL_PRESETS: readonly TuningPreset[] = [
  ...GUITAR_PRESETS,
  ...BASS_PRESETS,
  ...UKULELE_PRESETS,
];

export const PRESETS_BY_ID: ReadonlyMap<string, TuningPreset> = new Map(
  ALL_PRESETS.map((presetValue) => [presetValue.id, presetValue]),
);

export const DEFAULT_TUNING_ID = GUITAR_STANDARD.id;

export function findPreset(id: string): TuningPreset | undefined {
  return PRESETS_BY_ID.get(id);
}

export function presetsByFamily(family: InstrumentFamily): readonly TuningPreset[] {
  return ALL_PRESETS.filter((presetValue) => presetValue.family === family);
}
