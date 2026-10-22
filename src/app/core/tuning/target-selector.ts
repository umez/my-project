/**
 * Target selection, including the "Between strings" rule.
 *
 * Auto mode always picks the nearest string, but reports an ambiguity when the
 * two nearest strings are so close in distance that the player's intent cannot
 * be inferred. This prevents confidently showing the wrong string when a note
 * sits between two strings.
 */

import { hzFromMidi, offsetCents } from '../dsp/cents';
import type { TuningString } from './tuning-model';

/** Within this many cents of a string, that string is the intended target. */
export const MATCH_WINDOW_CENTS = 50;
/** Two strings this close in distance are considered ambiguous. */
export const AMBIGUITY_SPREAD_CENTS = 100;
/**
 * Sub-cent margin on the ambiguity boundary. The published boundary cases are
 * quoted to 0.1 cent (98 Hz is exactly 100.0 cents apart at display precision),
 * so this absorbs that rounding and keeps the boundary inclusive.
 */
export const AMBIGUITY_EPSILON_CENTS = 0.05;
/** A challenger must be this much closer before it can win. */
export const HYSTERESIS_CENTS = 15;
/** ...and must stay closer for this long. */
export const DWELL_MS = 300;
/** Float tolerance so exact boundaries count as inside the window. */
export const EPSILON = 1e-6;

export interface StringCandidate {
  readonly string: TuningString;
  readonly targetHz: number;
  readonly distanceCents: number;
}

export interface TargetSelection {
  /** Null while the reading is ambiguous ("Between strings"). */
  readonly selected: StringCandidate | null;
  readonly runnerUp: StringCandidate | null;
  readonly candidates: readonly StringCandidate[];
  readonly ambiguous: boolean;
}

function distanceOf(frequencyHz: number, targetHz: number): number {
  return Math.abs(offsetCents(frequencyHz, targetHz));
}

/**
 * Rank every string of the active tuning by distance from the reading.
 * Ties are broken toward the thicker string (lower order) so the display does
 * not flip between two strings of identical pitch.
 */
export function rankStrings(
  frequencyHz: number,
  referenceHz: number,
  strings: readonly TuningString[],
): StringCandidate[] {
  return strings
    .map((string) => {
      const targetHz = hzFromMidi(string.midi, referenceHz);
      return { string, targetHz, distanceCents: distanceOf(frequencyHz, targetHz) };
    })
    .sort((a, b) => {
      const delta = a.distanceCents - b.distanceCents;
      if (Math.abs(delta) > EPSILON) {
        return delta;
      }
      return a.string.order - b.string.order;
    });
}

export function isAmbiguous(candidates: readonly StringCandidate[]): boolean {
  if (candidates.length < 2) {
    return false;
  }
  const nearest = candidates[0].distanceCents;
  const second = candidates[1].distanceCents;
  return (
    nearest > MATCH_WINDOW_CENTS &&
    second - nearest <= AMBIGUITY_SPREAD_CENTS + AMBIGUITY_EPSILON_CENTS
  );
}

/** Stateless selection; use `TargetSelector` when hysteresis is required. */
export function selectTarget(
  frequencyHz: number,
  referenceHz: number,
  strings: readonly TuningString[],
): TargetSelection {
  const candidates = rankStrings(frequencyHz, referenceHz, strings);
  const ambiguous = isAmbiguous(candidates);
  return {
    selected: ambiguous ? null : (candidates[0] ?? null),
    runnerUp: candidates[1] ?? null,
    candidates,
    ambiguous,
  };
}

/**
 * Stateful selector implementing the 15 cent / 300 ms hand-off rule.
 *
 * Once a string is selected it keeps the display stable until another string is
 * at least 15 cents closer for 300 ms. Ambiguity suspends the target entirely.
 */
export class TargetSelector {
  private selectedOrder: number | null = null;
  private challengerOrder: number | null = null;
  private challengerSinceMs = 0;

  update(
    frequencyHz: number,
    referenceHz: number,
    strings: readonly TuningString[],
    nowMs: number,
  ): TargetSelection {
    const candidates = rankStrings(frequencyHz, referenceHz, strings);
    const ambiguous = isAmbiguous(candidates);

    if (ambiguous) {
      this.challengerOrder = null;
      return {
        selected: null,
        runnerUp: candidates[1] ?? null,
        candidates,
        ambiguous: true,
      };
    }

    const desired = candidates[0];
    if (!desired) {
      return { selected: null, runnerUp: null, candidates, ambiguous: false };
    }

    if (this.selectedOrder === null) {
      this.selectedOrder = desired.string.order;
      this.challengerOrder = null;
    } else if (desired.string.order !== this.selectedOrder) {
      const current = candidates.find((candidate) => candidate.string.order === this.selectedOrder);
      const improvement = current
        ? current.distanceCents - desired.distanceCents
        : Number.POSITIVE_INFINITY;

      if (improvement >= HYSTERESIS_CENTS - EPSILON) {
        if (this.challengerOrder !== desired.string.order) {
          this.challengerOrder = desired.string.order;
          this.challengerSinceMs = nowMs;
        } else if (nowMs - this.challengerSinceMs >= DWELL_MS) {
          this.selectedOrder = desired.string.order;
          this.challengerOrder = null;
        }
      } else {
        this.challengerOrder = null;
      }
    } else {
      this.challengerOrder = null;
    }

    const selected =
      candidates.find((candidate) => candidate.string.order === this.selectedOrder) ?? null;
    const runnerUp =
      candidates.find((candidate) => candidate.string.order !== this.selectedOrder) ?? null;

    return { selected, runnerUp, candidates, ambiguous: false };
  }

  /** Lock onto one string (manual mode). */
  selectManual(order: number): void {
    this.selectedOrder = order;
    this.challengerOrder = null;
  }

  get currentOrder(): number | null {
    return this.selectedOrder;
  }

  reset(): void {
    this.selectedOrder = null;
    this.challengerOrder = null;
    this.challengerSinceMs = 0;
  }
}
