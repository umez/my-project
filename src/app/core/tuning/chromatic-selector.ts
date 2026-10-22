/**
 * Chromatic mode: nearest equal-tempered note with an 8 cent hand-off
 * hysteresis so the note name does not flicker between semitones.
 */

import { hzFromMidi, midiFromHz } from '../dsp/cents';
import { midiToNote } from '../dsp/notes';

export const CHROMATIC_HYSTERESIS_CENTS = 8;

export interface ChromaticCandidate {
  readonly midi: number;
  readonly note: string;
  readonly octave: number;
  readonly targetHz: number;
  /** Absolute distance, used for hand-off decisions. */
  readonly distanceCents: number;
  /** Signed offset: positive is sharp. */
  readonly cents: number;
}

export function nearestNote(frequencyHz: number, referenceHz: number): ChromaticCandidate {
  // The tiny offset makes an exact .5 tie resolve upward as specified, without
  // changing any non-tie quantization.
  const midiFloat = midiFromHz(frequencyHz, referenceHz);
  const midi = Math.round(midiFloat + 1e-9);
  const info = midiToNote(midi);
  const targetHz = hzFromMidi(midi, referenceHz);
  const cents = 100 * (midiFloat - midi);
  return {
    midi,
    note: info.note,
    octave: info.octave,
    targetHz,
    distanceCents: Math.abs(cents),
    cents,
  };
}

export class ChromaticSelector {
  private currentMidi: number | null = null;

  update(frequencyHz: number, referenceHz: number): ChromaticCandidate {
    const desired = nearestNote(frequencyHz, referenceHz);

    if (this.currentMidi === null) {
      this.currentMidi = desired.midi;
      return desired;
    }

    if (desired.midi === this.currentMidi) {
      return desired;
    }

    // Only apply hysteresis to adjacent semitones; octave jumps are real.
    if (Math.abs(desired.midi - this.currentMidi) === 1) {
      const currentHz = hzFromMidi(this.currentMidi, referenceHz);
      const currentDistance = Math.abs(1200 * Math.log2(frequencyHz / currentHz));
      if (desired.distanceCents + CHROMATIC_HYSTERESIS_CENTS >= currentDistance) {
        const info = midiToNote(this.currentMidi);
        return {
          midi: this.currentMidi,
          note: info.note,
          octave: info.octave,
          targetHz: currentHz,
          distanceCents: currentDistance,
          cents: 100 * (midiFromHz(frequencyHz, referenceHz) - this.currentMidi),
        };
      }
    }

    this.currentMidi = desired.midi;
    return desired;
  }

  reset(): void {
    this.currentMidi = null;
  }
}
