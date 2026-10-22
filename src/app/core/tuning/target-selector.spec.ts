import { describe, expect, it } from 'vitest';
import { createString, type TuningString } from './tuning-model';
import { GUITAR_STANDARD } from './presets';
import {
  DWELL_MS,
  HYSTERESIS_CENTS,
  isAmbiguous,
  rankStrings,
  selectTarget,
  TargetSelector,
} from './target-selector';

const REFERENCE = 440;
const STRINGS: readonly TuningString[] = GUITAR_STANDARD.strings;

describe('target selection truth table', () => {
  it('selects E2 when it is exactly in tune', () => {
    const result = selectTarget(82.4069, REFERENCE, STRINGS);
    expect(result.ambiguous).toBe(false);
    expect(result.selected?.string.stringNumber).toBe(6);
    expect(result.selected?.distanceCents).toBeLessThan(0.01);
  });

  it('keeps a far-sharp reading on E2 when no other string is close', () => {
    const result = selectTarget(90, REFERENCE, STRINGS);
    expect(result.ambiguous).toBe(false);
    expect(result.selected?.string.stringNumber).toBe(6);
    expect(result.selected?.distanceCents).toBeCloseTo(152.6, 1);
  });

  it('keeps a far-flat reading on E2', () => {
    const result = selectTarget(75.3, REFERENCE, STRINGS);
    expect(result.ambiguous).toBe(false);
    expect(result.selected?.string.stringNumber).toBe(6);
  });

  it('reports "Between strings" at the inclusive 100 cent spread boundary', () => {
    // At 98 Hz, A2 is 200 cents away and E2 is 300 cents away: spread = 100.
    const result = selectTarget(98, REFERENCE, STRINGS);
    expect(result.ambiguous).toBe(true);
    expect(result.selected).toBeNull();
    expect(result.runnerUp?.string.stringNumber).toBe(6);
  });

  it('still reports ambiguous inside the boundary', () => {
    const result = selectTarget(97, REFERENCE, STRINGS);
    expect(result.ambiguous).toBe(true);
    expect(result.selected).toBeNull();
  });

  it('resolves once the strings are more than 100 cents apart in distance', () => {
    const result = selectTarget(99.5, REFERENCE, STRINGS);
    expect(result.ambiguous).toBe(false);
    expect(result.selected?.string.stringNumber).toBe(5);
  });

  it('does not treat an in-tune reading as ambiguous', () => {
    const result = selectTarget(110, REFERENCE, STRINGS);
    expect(result.ambiguous).toBe(false);
    expect(result.selected?.string.stringNumber).toBe(5);
    expect(isAmbiguous(result.candidates)).toBe(false);
  });

  it('ranks candidates by distance, thickest first on a tie', () => {
    const duplicate: TuningString[] = [
      createString(0, 6, 'E', 2),
      createString(1, 5, 'E', 2),
    ];
    const ranked = rankStrings(82.4069, REFERENCE, duplicate);
    expect(ranked[0].string.order).toBe(0);
    expect(ranked[1].string.order).toBe(1);
  });
});

describe('TargetSelector hysteresis', () => {
  it('requires the challenger to be 15 cents closer for 300 ms', () => {
    const selector = new TargetSelector();
    const first = selector.update(82.4069, REFERENCE, STRINGS, 0);
    expect(first.selected?.string.stringNumber).toBe(6);

    // 99.5 Hz: A2 is the nearest string, outside the ambiguous window and
    // comfortably more than 15 cents closer than E2.
    const ranked = rankStrings(99.5, REFERENCE, STRINGS);
    const improvement = ranked[1].distanceCents - ranked[0].distanceCents;
    expect(improvement).toBeGreaterThanOrEqual(HYSTERESIS_CENTS);

    const atZero = selector.update(99.5, REFERENCE, STRINGS, 100);
    expect(atZero.selected?.string.stringNumber).toBe(6);

    const beforeDwell = selector.update(99.5, REFERENCE, STRINGS, 100 + DWELL_MS - 1);
    expect(beforeDwell.selected?.string.stringNumber).toBe(6);

    const afterDwell = selector.update(99.5, REFERENCE, STRINGS, 100 + DWELL_MS);
    expect(afterDwell.selected?.string.stringNumber).toBe(5);
  });

  it('cancels a switch when the challenger stops being 15 cents closer', () => {
    const selector = new TargetSelector();
    selector.update(82.4069, REFERENCE, STRINGS, 0);
    selector.update(99.5, REFERENCE, STRINGS, 100); // challenger A2 starts
    selector.update(99.5, REFERENCE, STRINGS, 250);
    // Back near E2: the challenger disappears.
    const back = selector.update(84, REFERENCE, STRINGS, 260);
    expect(back.selected?.string.stringNumber).toBe(6);
    const later = selector.update(99.5, REFERENCE, STRINGS, 10_000);
    expect(later.selected?.string.stringNumber).toBe(6);
  });

  it('survives an ambiguous reading without losing its lock', () => {
    const selector = new TargetSelector();
    selector.update(82.4069, REFERENCE, STRINGS, 0);
    const ambiguous = selector.update(98, REFERENCE, STRINGS, 100);
    expect(ambiguous.ambiguous).toBe(true);
    expect(ambiguous.selected).toBeNull();
    const back = selector.update(82.4069, REFERENCE, STRINGS, 200);
    expect(back.selected?.string.stringNumber).toBe(6);
  });

  it('resets cleanly', () => {
    const selector = new TargetSelector();
    selector.update(110, REFERENCE, STRINGS, 0);
    selector.reset();
    expect(selector.currentOrder).toBeNull();
    const next = selector.update(82.4069, REFERENCE, STRINGS, 10);
    expect(next.selected?.string.stringNumber).toBe(6);
  });

  it('honours an explicit manual lock', () => {
    const selector = new TargetSelector();
    selector.selectManual(1);
    expect(selector.currentOrder).toBe(1);
  });
});
