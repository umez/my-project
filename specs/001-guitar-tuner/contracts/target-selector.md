# Contract: Target Selector

**Modules**: `src/app/core/tuning/target-selector.ts`, `src/app/core/dsp/cents.ts`,
`src/app/core/dsp/notes.ts`
**Consumers**: tuner page, worker result handler, unit tests
**Type**: Pure functions plus one small stateful selector for hysteresis.

## Constants

| Name | Value | Meaning |
| --- | --- | --- |
| `MATCH_WINDOW_CENTS` | 50 | Beyond this distance a reading is "far off" |
| `AMBIGUITY_SPREAD_CENTS` | 100 | Runner-up within this of `d1` means ambiguous |
| `AMBIGUITY_EPSILON_CENTS` | 0.05 | Sub-cent margin keeping the published boundary inclusive |
| `HYSTERESIS_CENTS` | 15 | A new target must be closer by at least this much |
| `DWELL_MS` | 300 | How long the margin must hold before switching |
| `EPSILON` | 1e-6 | Floating-point guard on the inclusive boundary |
| `CHROMATIC_HYSTERESIS_CENTS` | 8 | Boundary hysteresis for note quantization |

## Auto Mode

```ts
export interface TargetSelectionInput {
  frequencyHz: number;
  referenceHz: number;
  strings: readonly TuningString[];
  previous: { order: number; sinceMs: number } | null;
  nowMs: number;
}

export interface TargetSelection {
  selected: TuningString | null;
  runnerUp: TuningString | null;
  candidates: TargetCandidate[];   // sorted by distanceCents ascending
  nearestDistance: number;         // d1
  runnerUpDistance: number;        // d2
  ambiguous: boolean;
  reason: 'nearest' | 'ambiguous' | 'none';
}

export function selectTarget(input: TargetSelectionInput): TargetSelection;
```

Rules, in order:

1. Compute `offsetCents` and `distanceCents` for every string from the configured reference.
2. Sort ascending by `distanceCents`; ties broken by lower `midi` (thicker string).
3. `d1 = candidates[0].distanceCents`, `d2 = candidates[1]?.distanceCents ?? Infinity`.
4. `ambiguous = d1 > 50 && (d2 − d1) ≤ 100 + EPSILON`.
5. If `ambiguous`, return `selected = null`, `reason = 'ambiguous'` — **unless** the previously
   selected target is still ambiguous, in which case keep returning the ambiguous state until
   the condition clears for `DWELL_MS`.
6. Otherwise, apply hysteresis: the candidate becomes `selected` immediately if it is the same
   as `previous.order`, or if `previous` is null. If it differs, it becomes `selected` only
   when `previous` is absent, or when `d_candidate + 15 < d_previous` has held for `DWELL_MS`.
   Until then, return the previously selected string even if another is now marginally closer.
7. Never mark a target selected in the ambiguous state.

## Manual Mode

`selectManual(string, frequencyHz, referenceHz)` returns that string as `selected`
unconditionally, with `ambiguous = false`. Add `farFromTarget = distanceCents > 100` so the UI
can show "Wrong string? Nearest is B3". Manual mode never returns `reason = 'ambiguous'`.

## Chromatic Mode

```ts
export function nearestNote(
  frequencyHz: number,
  referenceHz: number,
  previousMidi: number | null,
  previousSinceMs: number | null,
  nowMs: number,
): { midi: number; cents: number; targetHz: number; changed: boolean };
```

- `midiFloat = 69 + 12·log2(f / referenceHz)`, `nearest = round(midiFloat)`.
- When the fractional part is within 8 cents of the .5 boundary, keep the previous note until
  the new side has held for `DWELL_MS`.
- Exact tie (`.5` exactly) resolves to the higher note.
- Always returns `cents = 100·(midiFloat − nearest)` in −50..+50.

## Truth Table (Standard tuning, A4 = 440 Hz)

| Input | Nearest (offset) | Runner-up (distance) | `d2 − d1` | Result |
| --- | --- | --- | --- | --- |
| 110.000 Hz | A2 (0.0 ¢) | E2 (500.0 ¢) | 500.0 | **In tune, A2** |
| 109.000 Hz | A2 (−15.8 ¢) | E2 (484.2 ¢) | 468.4 | **Flat, A2** |
| 111.000 Hz | A2 (+15.7 ¢) | E2 (515.7 ¢) | 484.3 | **Sharp, A2** |
| 90.000 Hz | E2 (+152.5 ¢) | A2 (347.5 ¢) | 195.0 | **Sharp, E2, pegged** |
| 75.300 Hz | E2 (−156.0 ¢) | A2 (656.0 ¢) | 500.0 | **Flat, E2, pegged** |
| 95.180 Hz | E2 (+250.0 ¢) / A2 (−250.0 ¢) | tie | 0.0 | **Between strings** |
| 98.000 Hz | A2 (−200.0 ¢) | E2 (300.0 ¢) | 100.0 | **Between strings (boundary, inclusive)** |
| 220.000 Hz | G3 (+200.0 ¢) / B3 (−200.0 ¢) | tie | 0.0 | **Between strings** |
| 82.407 Hz | E2 (0.0 ¢) | A2 (500.0 ¢) | 500.0 | **In tune, E2** |

Tolerance for the In tune rows: `|offset| ≤ settings.toleranceCents`.

## Hysteresis Sequence Test

Input: Standard tuning, starting with E2 selected.

| t (ms) | Input | Expected output |
| --- | --- | --- |
| 0 | 82.407 Hz | E2 selected, 0 ¢ |
| 100 | 99.500 Hz | E2 still selected (candidate A2 is closer, dwell not met) |
| 250 | 99.500 Hz | E2 still selected (dwell 150 ms < 300) |
| 400 | 99.500 Hz | A2 selected (dwell ≥ 300 ms) |
| 450 | 220.000 Hz | Between strings; no selected target |
| 800 | 220.000 Hz | Between strings (held for 300 ms) |
| 1200 | 246.942 Hz | B3 selected, 0 ¢ |

Note: 98 Hz is itself an ambiguous boundary case (see the truth table), so the
hand-off sequence uses 99.5 Hz, which is outside the ambiguous window.

## Invariants

1. `ambiguous = true` implies `selected = null` and `reason = 'ambiguous'`.
2. `candidates` is always sorted by `distanceCents`; ties by lower MIDI.
3. Distance uses the cents domain only; no hertz subtraction anywhere.
4. All returned frequencies derive from the passed `referenceHz`, never a constant 440.
5. The function never mutates `strings` or `previous`.
