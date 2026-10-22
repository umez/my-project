import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TunerReading } from '../../shared/state/session.store';

@Component({
  selector: 'app-pitch-readout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="readout">
      <p class="sr-only" aria-live="polite">{{ announcement() }}</p>
      @if (reading().status === 'between') {
        <p class="state between">Between strings</p>
        <p class="hint">Play one string, or pick a string below.</p>
        <ul class="candidates">
          @for (candidate of reading().candidates; track candidate.note + candidate.octave) {
            <li>
              <span class="candidate-note">{{ candidate.note }}{{ candidate.octave }}</span>
              <span class="candidate-cents">{{ formatCents(candidate.cents) }}</span>
            </li>
          }
        </ul>
      } @else {
        <p class="note" [class.empty]="!reading().note">{{ noteText() }}</p>
        <div class="numbers">
          <p>
            <span class="label">Detected</span>
            <span class="value">{{ frequencyText() }}</span>
          </p>
          <p>
            <span class="label">Target</span>
            <span class="value">{{ targetText() }}</span>
          </p>
          <p>
            <span class="label">Offset</span>
            <span class="value">{{ centsText() }}</span>
          </p>
        </div>
        <p class="state" [attr.data-state]="reading().label">{{ reading().label }}</p>
        @if (reading().stringNumber !== null) {
          <p class="hint">String {{ reading().stringNumber }}</p>
        }
        @if (reading().hint) {
          <p class="hint">{{ reading().hint }}</p>
        }
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .readout {
        text-align: center;
        color: var(--text);
      }
      .note {
        font-size: clamp(3rem, 14vw, 5rem);
        font-weight: 650;
        letter-spacing: -0.02em;
        margin: 0;
        line-height: 1;
      }
      .note.empty {
        color: var(--muted);
      }
      .numbers {
        display: flex;
        justify-content: center;
        gap: 1.5rem;
        margin: 0.75rem 0 0.5rem;
        flex-wrap: wrap;
      }
      .numbers p {
        margin: 0;
        display: flex;
        flex-direction: column;
        min-width: 5.5rem;
      }
      .label {
        font-size: 0.7rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .value {
        font-variant-numeric: tabular-nums;
        font-size: 1.05rem;
      }
      .state {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0.5rem 0 0.25rem;
      }
      .state[data-state='In tune'] {
        color: var(--accent);
      }
      .state[data-state='Flat'],
      .state[data-state='Sharp'] {
        color: var(--text);
      }
      .state.between {
        color: var(--muted);
        letter-spacing: 0.02em;
      }
      .candidates {
        list-style: none;
        padding: 0;
        margin: 0.75rem auto 0;
        display: flex;
        gap: 1.5rem;
        justify-content: center;
      }
      .candidates li {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .candidate-note {
        font-size: 1.5rem;
        font-weight: 600;
      }
      .candidate-cents {
        color: var(--muted);
        font-variant-numeric: tabular-nums;
      }
      .hint {
        color: var(--muted);
        font-size: 0.9rem;
        margin: 0.25rem 0 0;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `,
  ],
})
export class PitchReadoutComponent {
  readonly reading = input.required<TunerReading>();

  readonly noteText = computed(() => {
    const reading = this.reading();
    if (!reading.note) {
      return '—';
    }
    return reading.octave === null ? reading.note : `${reading.note}${reading.octave}`;
  });

  readonly frequencyText = computed(() => this.hertz(this.reading().frequencyHz));
  readonly targetText = computed(() => this.hertz(this.reading().targetHz));

  readonly centsText = computed(() => {
    const cents = this.reading().cents;
    if (cents === null || !Number.isFinite(cents)) {
      return '—';
    }
    return this.formatCents(cents);
  });

  /** Announced only when the note or state changes, not on every frame. */
  readonly announcement = computed(() => {
    const reading = this.reading();
    if (reading.status === 'between') {
      return 'Between strings';
    }
    if (reading.status === 'reading' && reading.note) {
      return `${reading.note}${reading.octave ?? ''} ${reading.label}`;
    }
    return reading.label;
  });

  formatCents(cents: number): string {
    if (!Number.isFinite(cents)) {
      return '—';
    }
    const rounded = Math.round(cents);
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded} ¢`;
  }

  private hertz(value: number | null): string {
    return value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(1)} Hz`;
  }
}
