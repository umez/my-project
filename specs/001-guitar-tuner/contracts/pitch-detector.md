# Contract: Pitch Detector

**Module**: `src/app/core/dsp/pitch-detector.ts`
**Consumers**: `pitch.worker.ts` (production), Vitest fixtures (tests)
**Type**: Pure function. No I/O, no globals, no framework imports, deterministic.

## Interface

```ts
export interface PitchEstimate {
  /** Detected fundamental in hertz. Guaranteed within [40, 1000]. */
  readonly frequencyHz: number;
  /** Normalized NSDF peak height in [0, 1]. */
  readonly clarity: number;
  /** Frame level in dBFS, always <= 0. */
  readonly rmsDb: number;
}

export function analyzeFrame(
  samples: Float32Array,
  sampleRate: number,
): PitchEstimate | null;
```

## Preconditions

| Condition | Requirement |
| --- | --- |
| `samples.length` | Exactly 4096 (scaled to keep the same time window if the sample rate is not 48 kHz) |
| `sampleRate` | 44100..48000 |
| Sample values | Finite, nominally −1.0..1.0; non-finite values are treated as 0 |
| Frame age | Represents the most recent complete window |

## Postconditions

1. Returns `null` when any of: `rmsDb < −55`, `clarity < 0.85`, or the estimate falls outside
   40..1000 Hz.
2. When non-null, `40 ≤ frequencyHz ≤ 1000` and `0 ≤ clarity ≤ 1`.
3. For a pure sine at a stable frequency in range, the returned frequency is within **1 cent**
   of ground truth after parabolic interpolation.
4. For a harmonic-rich plucked fixture, the returned frequency is within **2 cents** and never
   an octave (or twelfth) away from the fundamental.
5. Calling twice with identical input returns identical output.
6. No allocation is observable to callers beyond the returned object; the input array is not
   mutated.

## Accuracy Fixtures

| Fixture | Frequency | Expected error | Expected result |
| --- | --- | --- | --- |
| Sine, bass E1 | 41.203 Hz | ≤1 ¢ | non-null, clarity ≥0.95 |
| Sine, E2 | 82.407 Hz | ≤1 ¢ | non-null |
| Sine, A2 | 110.000 Hz | ≤1 ¢ | non-null |
| Sine, D3 | 146.832 Hz | ≤1 ¢ | non-null |
| Sine, G3 | 195.998 Hz | ≤1 ¢ | non-null |
| Sine, B3 | 246.942 Hz | ≤1 ¢ | non-null |
| Sine, E4 | 329.628 Hz | ≤1 ¢ | non-null |
| Sine, top of range | 1000.000 Hz | ≤1 ¢ | non-null |
| Sine, E2 −50 ¢ | 80.034 Hz | ≤1 ¢ | non-null |
| Sine, E2 +50 ¢ | 84.805 Hz | ≤1 ¢ | non-null |
| Plucked E2 (harmonics 1..8, exponential decay) | 82.407 Hz | ≤2 ¢ | non-null, not 164.8 Hz |
| Plucked G3 with strong second harmonic | 195.998 Hz | ≤2 ¢ | non-null, not 392.0 Hz |
| White noise, −30 dBFS | n/a | n/a | `null` |
| Silence | n/a | n/a | `null` |
| Sine below range | 30.0 Hz | n/a | `null` |
| Sine above range | 1200.0 Hz | n/a | `null` |

## Performance

- Single frame analysis completes in ≤5 ms on the reference mid-range Android device.
- The production path runs inside `pitch.worker.ts`, never on the UI thread.

## Algorithm Summary

1. Remove DC offset; compute RMS.
2. Window the 4096 samples (Hann) and zero-pad to 8192.
3. Compute the NSDF using FFT-based autocorrelation.
4. Find the first significant peak above the clarity threshold; refine by parabolic
   interpolation of the peak and its neighbors.
5. Convert lag to frequency (`sampleRate / lag`) and compute clarity from the peak height.

Any change to these steps requires re-running the full fixture table; a regression in the
plucked-string rows is a release blocker under Principle I.
