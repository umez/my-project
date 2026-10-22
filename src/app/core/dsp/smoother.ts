/**
 * Reading smoother: median-of-five outlier rejection followed by an exponential
 * moving average, all in the cents domain, with a small deadband so the last
 * displayed digit settles.
 *
 * `reset()` MUST be called whenever the selected target changes; otherwise the
 * filter would interpolate between two different strings.
 */

export const DEFAULT_WINDOW = 5;
export const DEFAULT_ALPHA = 0.3;
export const DEFAULT_DEADBAND_CENTS = 0.3;

export class PitchSmoother {
  private readonly window: number;
  private readonly alpha: number;
  private readonly deadband: number;
  private readonly history: number[] = [];
  private ema: number | null = null;
  private output: number | null = null;

  constructor(
    window: number = DEFAULT_WINDOW,
    alpha: number = DEFAULT_ALPHA,
    deadband: number = DEFAULT_DEADBAND_CENTS,
  ) {
    this.window = Math.max(1, Math.floor(window));
    this.alpha = Math.min(1, Math.max(0, alpha));
    this.deadband = Math.max(0, deadband);
  }

  push(cents: number): number {
    this.history.push(cents);
    if (this.history.length > this.window) {
      this.history.shift();
    }

    const median = medianOf(this.history);
    if (this.ema === null) {
      this.ema = median;
    } else {
      this.ema += this.alpha * (median - this.ema);
    }

    if (this.output === null || Math.abs(this.ema - this.output) >= this.deadband) {
      this.output = this.ema;
    }
    return this.output;
  }

  get value(): number | null {
    return this.output;
  }

  reset(): void {
    this.history.length = 0;
    this.ema = null;
    this.output = null;
  }
}

function medianOf(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
