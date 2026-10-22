import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TunerStatus } from '../../shared/state/session.store';

interface Tick {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly major: boolean;
}

const CENTER_X = 120;
const CENTER_Y = 120;
const MAX_ANGLE = 60;
const CLAMP_CENTS = 50;

@Component({
  selector: 'app-needle-gauge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure
      class="gauge"
      [class.dimmed]="dimmed()"
      [class.in-tune]="inTune()"
      [attr.aria-label]="ariaLabel()"
      role="img"
    >
      <svg viewBox="0 0 240 150" aria-hidden="true">
        <path class="arc" d="M 45.5 77 A 86 86 0 0 1 194.5 77" />
        @for (tick of ticks; track $index) {
          <line
            class="tick"
            [class.major]="tick.major"
            [attr.x1]="tick.x1"
            [attr.y1]="tick.y1"
            [attr.x2]="tick.x2"
            [attr.y2]="tick.y2"
          />
        }
        <text class="end-label" x="24" y="96">−50</text>
        <text class="end-label" x="204" y="96">+50</text>
        <line
          class="needle"
          x1="120"
          y1="120"
          x2="120"
          y2="40"
          [style.transform]="'rotate(' + angle() + 'deg)'"
        />
        <circle class="hub" cx="120" cy="120" r="6" />
      </svg>
      <figcaption class="units">cents</figcaption>
    </figure>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .gauge {
        margin: 0;
        position: relative;
        color: var(--text);
      }
      svg {
        width: 100%;
        max-width: 360px;
        display: block;
        margin: 0 auto;
      }
      .arc {
        fill: none;
        stroke: var(--muted);
        stroke-width: 2;
        opacity: 0.35;
      }
      .tick {
        stroke: var(--muted);
        stroke-width: 2;
        opacity: 0.6;
      }
      .tick.major {
        stroke-width: 3;
        opacity: 0.9;
      }
      .end-label {
        fill: var(--muted);
        font-size: 11px;
        text-anchor: middle;
      }
      .needle {
        stroke: var(--needle);
        stroke-width: 4;
        stroke-linecap: round;
        transform-origin: 120px 120px;
        transition: transform 80ms linear;
      }
      .hub {
        fill: var(--needle);
      }
      .gauge.in-tune {
        color: var(--accent);
      }
      .gauge.in-tune .needle {
        stroke: var(--accent);
      }
      .gauge.in-tune .hub {
        fill: var(--accent);
      }
      .gauge.dimmed {
        opacity: 0.45;
      }
      .units {
        text-align: center;
        color: var(--muted);
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      @media (prefers-reduced-motion: reduce) {
        .needle {
          transition: none;
        }
      }
    `,
  ],
})
export class NeedleGaugeComponent {
  readonly cents = input<number | null>(null);
  readonly tolerance = input(5);
  readonly status = input<TunerStatus>('idle');

  readonly ticks: readonly Tick[] = Array.from({ length: 11 }, (_, index) => {
    const cents = (index - 5) * 10;
    const radians = ((cents * (MAX_ANGLE / CLAMP_CENTS) - 90) * Math.PI) / 180;
    const major = index % 5 === 0;
    const outer = 86;
    const inner = major ? 76 : 81;
    return {
      x1: CENTER_X + Math.cos(radians) * outer,
      y1: CENTER_Y + Math.sin(radians) * outer,
      x2: CENTER_X + Math.cos(radians) * inner,
      y2: CENTER_Y + Math.sin(radians) * inner,
      major,
    };
  });

  readonly angle = computed(() => {
    const cents = this.cents();
    if (cents === null || !Number.isFinite(cents)) {
      return 0;
    }
    const clamped = Math.max(-CLAMP_CENTS, Math.min(CLAMP_CENTS, cents));
    return clamped * (MAX_ANGLE / CLAMP_CENTS);
  });

  readonly inTune = computed(() => {
    const cents = this.cents();
    return (
      cents !== null &&
      this.status() === 'reading' &&
      Math.abs(cents) <= Math.max(0, this.tolerance())
    );
  });

  readonly dimmed = computed(
    () => this.status() === 'idle' || this.status() === 'between' || this.status() === 'denied',
  );

  readonly ariaLabel = computed(() => {
    const cents = this.cents();
    if (cents === null) {
      return 'Needle at center, no reading';
    }
    if (this.inTune()) {
      return 'In tune, needle centered';
    }
    const side = cents > 0 ? 'right, sharp' : 'left, flat';
    return `Needle ${side}, ${Math.round(Math.abs(cents))} cents`;
  });
}
