import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TuningMode } from '../../core/tuning/tuning-model';

@Component({
  selector: 'app-mode-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="segmented" role="group" aria-label="Tuner mode">
      @for (option of options; track option.value) {
        <button
          type="button"
          [class.active]="value() === option.value"
          [attr.aria-pressed]="value() === option.value"
          (click)="select(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .segmented {
        display: flex;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 4px;
        gap: 2px;
      }
      button {
        flex: 1;
        border: 0;
        background: transparent;
        color: var(--muted);
        font: inherit;
        font-size: 0.9rem;
        padding: 0.5rem 0.75rem;
        border-radius: 999px;
        cursor: pointer;
      }
      button.active {
        background: var(--text);
        color: var(--bg);
        font-weight: 600;
      }
      button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    `,
  ],
})
export class ModeSelectorComponent {
  readonly value = input<TuningMode>('auto');
  readonly valueChange = output<TuningMode>();

  readonly options: readonly { value: TuningMode; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'manual', label: 'Manual' },
    { value: 'chromatic', label: 'Chromatic' },
  ];

  select(mode: TuningMode): void {
    if (mode !== this.value()) {
      this.valueChange.emit(mode);
    }
  }
}
