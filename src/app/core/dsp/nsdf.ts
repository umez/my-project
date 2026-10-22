/**
 * Normalized square difference function (NSDF), the core of the McLeod Pitch
 * Method. The NSDF is bounded in [-1, 1], and its peak height is a usable
 * confidence value.
 */

import { autocorrelation, nextPowerOfTwo } from './fft';

export interface NsdfResult {
  /** NSDF values indexed by lag in samples. */
  readonly values: Float64Array;
  /** Highest lag evaluated. */
  readonly maxLag: number;
}

/**
 * Compute the NSDF for `signal` up to `maxLag` samples.
 *
 * n(tau) = 2 * r(tau) / m(tau), where
 *   r(tau) = sum_{j=0}^{W-tau-1} x[j] * x[j+tau]
 *   m(tau) = sum_{j=0}^{W-tau-1} x[j]^2 + sum_{j=tau}^{W-1} x[j]^2
 */
export function computeNsdf(signal: Float64Array, maxLag: number): NsdfResult {
  const window = signal.length;
  const limit = Math.max(1, Math.min(maxLag, window - 2));
  const size = nextPowerOfTwo(window * 2);

  const correlation = autocorrelation(signal, size);

  const prefix = new Float64Array(window + 1);
  for (let i = 0; i < window; i++) {
    prefix[i + 1] = prefix[i] + signal[i] * signal[i];
  }
  const totalEnergy = prefix[window];

  const values = new Float64Array(limit + 1);
  for (let tau = 0; tau <= limit; tau++) {
    const energy = prefix[window - tau] + (totalEnergy - prefix[tau]);
    values[tau] = energy > 0 ? (2 * correlation[tau]) / energy : 0;
  }

  return { values, maxLag: limit };
}
