/**
 * Persisted application state: schema, defaults, and defensive normalization.
 *
 * Anything read from storage is untrusted. `normalizeState` never throws; it
 * substitutes defaults for out-of-range or malformed fields so a corrupt entry
 * cannot brick the tuner.
 */

import { MAX_REFERENCE_HZ, MIN_REFERENCE_HZ } from '../dsp/cents';
import type { TuningMode } from '../tuning/tuning-model';

export const STATE_SCHEMA_VERSION = 1;
export const MIN_TOLERANCE_CENTS = 1;
export const MAX_TOLERANCE_CENTS = 50;
export const DEFAULT_REFERENCE_HZ = 440;
export const DEFAULT_TOLERANCE_CENTS = 5;

export type ThemeName = 'light' | 'dark';

export interface StoredString {
  readonly note: string;
  readonly octave: number;
}

export interface CustomTuning {
  readonly id: string;
  readonly name: string;
  /** Thickest first, matching the preset ordering. */
  readonly strings: readonly StoredString[];
}

export interface AppState {
  readonly schemaVersion: number;
  readonly referenceHz: number;
  readonly toleranceCents: number;
  readonly theme: ThemeName;
  readonly tuningId: string;
  readonly mode: TuningMode;
  readonly manualStringOrder: number | null;
  readonly customTunings: readonly CustomTuning[];
}

export const DEFAULT_STATE: AppState = {
  schemaVersion: STATE_SCHEMA_VERSION,
  referenceHz: DEFAULT_REFERENCE_HZ,
  toleranceCents: DEFAULT_TOLERANCE_CENTS,
  theme: 'light',
  tuningId: 'guitar-standard',
  mode: 'auto',
  manualStringOrder: null,
  customTunings: [],
};

const MODES: readonly TuningMode[] = ['auto', 'manual', 'chromatic'];
const THEMES: readonly ThemeName[] = ['light', 'dark'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeCustomTuning(value: unknown, index: number): CustomTuning | null {
  if (!isRecord(value)) {
    return null;
  }
  const rawStrings = value['strings'];
  if (!Array.isArray(rawStrings) || rawStrings.length < 4 || rawStrings.length > 8) {
    return null;
  }

  const strings: StoredString[] = [];
  for (const entry of rawStrings) {
    if (!isRecord(entry)) {
      return null;
    }
    const note = entry['note'];
    const octave = entry['octave'];
    if (typeof note !== 'string' || note.trim().length === 0) {
      return null;
    }
    if (typeof octave !== 'number' || !Number.isInteger(octave) || octave < 0 || octave > 8) {
      return null;
    }
    strings.push({ note: note.trim(), octave });
  }

  const rawId = value['id'];
  const rawName = value['name'];
  const id =
    typeof rawId === 'string' && rawId.trim().length > 0
      ? rawId.trim()
      : `custom-${index + 1}`;
  const name =
    typeof rawName === 'string' && rawName.trim().length > 0
      ? rawName.trim().slice(0, 40)
      : `Custom ${index + 1}`;

  return { id, name, strings };
}

/** Coerce arbitrary parsed JSON into a valid `AppState`. */
export function normalizeState(value: unknown): AppState {
  if (!isRecord(value)) {
    return DEFAULT_STATE;
  }

  const referenceHz = Math.round(
    clamp(
      finiteNumber(value['referenceHz'], DEFAULT_REFERENCE_HZ),
      MIN_REFERENCE_HZ,
      MAX_REFERENCE_HZ,
    ),
  );
  const toleranceCents = Math.round(
    clamp(
      finiteNumber(value['toleranceCents'], DEFAULT_TOLERANCE_CENTS),
      MIN_TOLERANCE_CENTS,
      MAX_TOLERANCE_CENTS,
    ),
  );

  const themeValue = value['theme'];
  const theme = THEMES.includes(themeValue as ThemeName)
    ? (themeValue as ThemeName)
    : DEFAULT_STATE.theme;

  const modeValue = value['mode'];
  const mode = MODES.includes(modeValue as TuningMode)
    ? (modeValue as TuningMode)
    : DEFAULT_STATE.mode;

  const tuningIdValue = value['tuningId'];
  const tuningId =
    typeof tuningIdValue === 'string' && tuningIdValue.trim().length > 0
      ? tuningIdValue.trim()
      : DEFAULT_STATE.tuningId;

  const manualValue = value['manualStringOrder'];
  const manualStringOrder =
    typeof manualValue === 'number' && Number.isInteger(manualValue) && manualValue >= 0
      ? manualValue
      : null;

  const rawCustom = value['customTunings'];
  const customTunings: CustomTuning[] = [];
  if (Array.isArray(rawCustom)) {
    rawCustom.forEach((entry, index) => {
      const normalized = normalizeCustomTuning(entry, index);
      if (normalized && !customTunings.some((existing) => existing.id === normalized.id)) {
        customTunings.push(normalized);
      }
    });
  }

  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    referenceHz,
    toleranceCents,
    theme,
    tuningId,
    mode,
    manualStringOrder,
    customTunings,
  };
}

export function customTuningKey(index: number): string {
  return `custom-${index + 1}`;
}
