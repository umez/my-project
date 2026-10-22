/** Conversion between the persisted custom-tuning shape and presets. */

import { createString, type TuningPreset, type TuningString } from '../tuning/tuning-model';
import type { CustomTuning, StoredString } from './persisted-state';

/** Custom strings are stored thickest first and numbered downward. */
export function customToPreset(custom: CustomTuning): TuningPreset {
  const count = custom.strings.length;
  const strings: TuningString[] = custom.strings.map((entry, index) =>
    createString(index, count - index, entry.note, entry.octave),
  );
  return {
    id: custom.id,
    name: custom.name,
    family: 'custom',
    builtIn: false,
    strings,
  };
}

export function presetToCustom(preset: TuningPreset): CustomTuning {
  const ordered = [...preset.strings].sort((a, b) => a.order - b.order);
  const strings: StoredString[] = ordered.map((string) => ({
    note: string.note,
    octave: string.octave,
  }));
  return { id: preset.id, name: preset.name, strings };
}

export function makeCustomId(existing: readonly CustomTuning[]): string {
  const used = new Set(existing.map((tuning) => tuning.id));
  let index = 1;
  while (used.has(`custom-${index}`)) {
    index += 1;
  }
  return `custom-${index}`;
}
