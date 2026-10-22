/**
 * Minimal radix-2 FFT used by the pitch detector.
 *
 * Pure TypeScript with no framework imports; runs in Node for tests and in a
 * Web Worker at runtime.
 */

export function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) {
    result <<= 1;
  }
  return result;
}

/**
 * In-place complex FFT. `re` and `im` must have the same power-of-two length.
 * When `inverse` is true the result is scaled by 1/N.
 */
export function fft(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length;
  if (n !== im.length || (n & (n - 1)) !== 0) {
    throw new Error('FFT input must be a power-of-two length');
  }

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    const half = len >> 1;

    for (let start = 0; start < n; start += len) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < half; j++) {
        const evenIndex = start + j;
        const oddIndex = evenIndex + half;

        const oddRe = re[oddIndex] * curRe - im[oddIndex] * curIm;
        const oddIm = re[oddIndex] * curIm + im[oddIndex] * curRe;

        const evenRe = re[evenIndex];
        const evenIm = im[evenIndex];

        re[evenIndex] = evenRe + oddRe;
        im[evenIndex] = evenIm + oddIm;
        re[oddIndex] = evenRe - oddRe;
        im[oddIndex] = evenIm - oddIm;

        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

/**
 * Linear autocorrelation via the Wiener-Khinchin theorem.
 * Returns r[tau] = sum_j signal[j] * signal[j + tau].
 */
export function autocorrelation(signal: Float64Array, size: number): Float64Array {
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  re.set(signal.subarray(0, Math.min(signal.length, size)));

  fft(re, im, false);
  for (let i = 0; i < size; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i];
    im[i] = 0;
  }
  fft(re, im, true);

  return re;
}
