import { describe, expect, it } from 'vitest';
import {
  ALL_PRESETS,
  BASS_4,
  DEFAULT_TUNING_ID,
  findPreset,
  GUITAR_DOUBLE_DROP_D,
  GUITAR_FULL_STEP_DOWN,
  GUITAR_HALF_STEP_DOWN,
  GUITAR_OPEN_D,
  GUITAR_OPEN_E,
  GUITAR_OPEN_G,
  GUITAR_STANDARD,
  presetsByFamily,
  UKULELE,
} from './presets';
import { validateTuning } from './tuning-model';

function midis(preset: { strings: readonly { midi: number }[] }): number[] {
  return preset.strings.map((string) => string.midi);
}

describe('built-in presets', () => {
  it('ships all required tunings', () => {
    expect(ALL_PRESETS).toHaveLength(11);
    expect(presetsByFamily('guitar')).toHaveLength(9);
    expect(presetsByFamily('bass')).toHaveLength(1);
    expect(presetsByFamily('ukulele')).toHaveLength(1);
    expect(findPreset(DEFAULT_TUNING_ID)?.id).toBe(GUITAR_STANDARD.id);
  });

  it('has no validation issues', () => {
    for (const preset of ALL_PRESETS) {
      expect(validateTuning(preset), preset.id).toEqual([]);
    }
  });

  it('encodes Standard tuning as E2 A2 D3 G3 B3 E4', () => {
    expect(midis(GUITAR_STANDARD)).toEqual([40, 45, 50, 55, 59, 64]);
    expect(GUITAR_STANDARD.strings.map((string) => string.stringNumber)).toEqual([
      6, 5, 4, 3, 2, 1,
    ]);
  });

  it('encodes Drop D and Double Drop D', () => {
    expect(findPreset('guitar-drop-d')?.strings.map((s) => s.midi)).toEqual([
      38, 45, 50, 55, 59, 64,
    ]);
    expect(midis(GUITAR_DOUBLE_DROP_D)).toEqual([38, 45, 50, 55, 59, 62]);
  });

  it('encodes Open G, Open D, and Open E', () => {
    expect(midis(GUITAR_OPEN_G)).toEqual([38, 43, 50, 55, 59, 62]);
    expect(midis(GUITAR_OPEN_D)).toEqual([38, 45, 50, 54, 57, 62]);
    expect(midis(GUITAR_OPEN_E)).toEqual([40, 47, 52, 56, 59, 64]);
  });

  it('encodes DADGAD', () => {
    expect(findPreset('guitar-dadgad')?.strings.map((s) => s.midi)).toEqual([
      38, 45, 50, 55, 57, 62,
    ]);
  });

  it('encodes half-step and full-step down', () => {
    expect(midis(GUITAR_HALF_STEP_DOWN)).toEqual([39, 44, 49, 54, 58, 63]);
    expect(midis(GUITAR_FULL_STEP_DOWN)).toEqual([38, 43, 48, 53, 57, 62]);
  });

  it('encodes 4-string bass as E1 A1 D2 G2', () => {
    expect(midis(BASS_4)).toEqual([28, 33, 38, 43]);
    expect(BASS_4.strings.map((s) => s.stringNumber)).toEqual([4, 3, 2, 1]);
  });

  it('encodes reentrant ukulele as G4 C4 E4 A4', () => {
    expect(midis(UKULELE)).toEqual([67, 60, 64, 69]);
    expect(UKULELE.strings[0].note).toBe('G');
    expect(UKULELE.strings[0].octave).toBe(4);
  });

  it('keeps authored flat spellings while storing sharp-correct MIDI', () => {
    expect(GUITAR_HALF_STEP_DOWN.strings[0].note).toBe('Eb');
    expect(GUITAR_HALF_STEP_DOWN.strings[0].midi).toBe(39);
  });
});
