/**
 * Pitch detection: RMS gate, NSDF/MPM peak picking, parabolic refinement.
 *
 * Pure function: no I/O, no framework imports, deterministic for identical
 * input. The accuracy contract lives in
 * `specs/001-guitar-tuner/contracts/pitch-detector.md`.
 */

import { isInDetectionRange, MAX_FREQUENCY_HZ, MIN_FREQUENCY_HZ } from './cents';
import { computeNsdf } from './nsdf';

export interface PitchEstimate {
  /** Detected fundamental in hertz, guaranteed inside the detection range. */
  readonly frequencyHz: number;
  /** NSDF peak height in [0, 1]. */
  readonly clarity: number;
  /** Frame level in dBFS, always <= 0. */
  readonly rmsDb: number;
}

export const MIN_RMS_DB = -55;
export const MIN_CLARITY = 0.85;
export const DEFAULT_FRAME_SIZE = 4096;
const PEAK_RATIO = 0.9;

/** RMS level of a frame in dBFS. Non-finite samples count as zero. */
export function rmsDbOf(samples: ArrayLike<number>): number {
  let sum = 0;
  const length = samples.length;
  for (let i = 0; i < length; i++) {
    const value = Number.isFinite(samples[i]) ? samples[i] : 0;
    sum += value * value;
  }
  const rms = Math.sqrt(sum / Math.max(1, length));
  return 20 * Math.log10(rms > 0 ? rms : 1e-12);
}

/** Remove the mean and copy into a Float64Array, coercing non-finite values. */
function normalize(samples: ArrayLike<number>): Float64Array {
  const length = samples.length;
  const out = new Float64Array(length);
  let sum = 0;
  for (let i = 0; i < length; i++) {
    const value = Number.isFinite(samples[i]) ? samples[i] : 0;
    out[i] = value;
    sum += value;
  }
  const mean = sum / Math.max(1, length);
  for (let i = 0; i < length; i++) {
    out[i] -= mean;
  }
  return out;
}

/**
 * Analyze one frame.
 *
 * Returns null when the frame is too quiet, too noisy, or outside the supported
 * range. A non-null result always satisfies `40 <= frequencyHz <= 1000` and
 * `clarity >= 0.85`.
 */
export function analyzeFrame(
  samples: ArrayLike<number>,
  sampleRate: number,
): PitchEstimate | null {
  const frame = normalize(samples);
  const rmsDb = rmsDbOf(frame);

  if (frame.length < 128 || !Number.isFinite(sampleRate) || sampleRate <= 0) {
    return null;
  }
  if (rmsDb < MIN_RMS_DB) {
    return null;
  }

  const minLag = Math.max(2, Math.floor(sampleRate / MAX_FREQUENCY_HZ));
  const maxLag = Math.min(frame.length - 2, Math.ceil(sampleRate / MIN_FREQUENCY_HZ));
  if (maxLag <= minLag) {
    return null;
  }

  const { values } = computeNsdf(frame, maxLag);
  if (values.length <= maxLag) {
    return null;
  }

  let globalMax = 0;
  for (let tau = minLag; tau <= maxLag; tau++) {
    if (values[tau] > globalMax) {
      globalMax = values[tau];
    }
  }
  if (globalMax < MIN_CLARITY) {
    return null;
  }

  const acceptance = Math.max(MIN_CLARITY, PEAK_RATIO * globalMax);
  let peakLag = -1;
  for (let tau = minLag + 1; tau < maxLag; tau++) {
    if (
      values[tau] >= values[tau - 1] &&
      values[tau] >= values[tau + 1] &&
      values[tau] >= acceptance
    ) {
      peakLag = tau;
      break;
    }
  }

  if (peakLag < 0) {
    // Fall back to the global maximum (covers peaks sitting on the boundary).
    for (let tau = minLag; tau <= maxLag; tau++) {
      if (values[tau] === globalMax) {
        peakLag = tau;
        break;
      }
    }
  }
  if (peakLag <= 0) {
    return null;
  }

  const left = peakLag > 0 ? values[peakLag - 1] : values[peakLag];
  const center = values[peakLag];
  const right = peakLag < maxLag ? values[peakLag + 1] : values[peakLag];
  const denominator = left - 2 * center + right;
  let delta = denominator !== 0 ? (0.5 * (left - right)) / denominator : 0;
  if (!Number.isFinite(delta) || Math.abs(delta) > 1) {
    delta = 0;
  }

  const lag = peakLag + delta;
  if (lag <= 0) {
    return null;
  }

  const frequencyHz = sampleRate / lag;
  const clarity = Math.min(1, Math.max(0, center));

  if (!isInDetectionRange(frequencyHz) || clarity < MIN_CLARITY) {
    return null;
  }

  return { frequencyHz, clarity, rmsDb };
}
