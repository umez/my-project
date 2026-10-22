import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TuningString } from '../../core/tuning/tuning-model';

@Component({
  selector: 'app-string-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chips" role="group" aria-label="Strings">
      @for (string of strings(); track string.order) {
        <button
          type="button"
          class="chip"
          [class.selected]="selectedOrder() === string.order"
          [attr.aria-pressed]="selectedOrder() === string.order"
          [attr.aria-label]="'String ' + string.stringNumber + ', ' + string.note + string.octave"
          (click)="orderChange.emit(string.order)"
        >
          <span class="number">{{ string.stringNumber }}</span>
          <span class="pitch">{{ string.note }}{{ string.octave }}</span>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .chips {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      .chip {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.1rem;
        min-width: 3.25rem;
        padding: 0.45rem 0.6rem;
        border-radius: 0.75rem;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        cursor: pointer;
        font: inherit;
      }
      .chip.selected {
        border-color: var(--accent);
        box-shadow: inset 0 0 0 1px var(--accent);
      }
      .number {
        font-size: 0.7rem;
        color: var(--muted);
      }
      .pitch {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .chip:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    `,
  ],
})
export class StringSelectorComponent {
  readonly strings = input<readonly TuningString[]>([]);
  readonly selectedOrder = input<number | null>(null);
  readonly orderChange = output<number>();
}
