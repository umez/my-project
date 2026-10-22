import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular';
import type { TuningPreset } from '../../core/tuning/tuning-model';
import { SettingsStore } from '../../shared/state/settings.store';

@Component({
  selector: 'app-tuning-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonHeader, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar>
        <div class="bar">
          <button class="back" type="button" (click)="back()" aria-label="Back to tuner">‹</button>
          <h1>Tunings</h1>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main class="list">
        @for (group of groups(); track group.family) {
          <section>
            <h2>{{ group.label }}</h2>
            <ul>
              @for (tuning of group.tunings; track tuning.id) {
                <li>
                  <button
                    class="row"
                    type="button"
                    [class.active]="settings.activeTuning().id === tuning.id"
                    [attr.aria-pressed]="settings.activeTuning().id === tuning.id"
                    (click)="select(tuning.id)"
                  >
                    <span class="name">{{ tuning.name }}</span>
                    <span class="notes">{{ notes(tuning) }}</span>
                  </button>
                  @if (!tuning.builtIn) {
                    <span class="row-actions">
                      <button type="button" (click)="edit(tuning)" [attr.aria-label]="'Edit ' + tuning.name">
                        Edit
                      </button>
                      <button type="button" (click)="remove(tuning)" [attr.aria-label]="'Delete ' + tuning.name">
                        Delete
                      </button>
                    </span>
                  }
                </li>
              }
            </ul>
          </section>
        }

        <button class="add" type="button" (click)="add()">Add custom tuning</button>
      </main>
    </ion-content>
  `,
  styles: [
    `
      ion-toolbar {
        --background: var(--surface);
        --color: var(--text);
        --border-color: var(--border);
      }
      .back {
        background: transparent;
        border: 0;
        color: var(--text);
        font-size: 1.6rem;
        line-height: 1;
        padding: 0 0.5rem;
        cursor: pointer;
      }
      .bar {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        min-height: 56px;
        padding: 0 0.5rem;
      }
      .bar h1 {
        font-size: 1.15rem;
        font-weight: 600;
        margin: 0;
      }
      ion-content {
        --background: var(--bg);
      }
      .list {
        max-width: 560px;
        margin: 0 auto;
        padding: 1rem 1.25rem 2.5rem;
      }
      h2 {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
        margin: 1.5rem 0 0.5rem;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      li {
        display: flex;
        align-items: stretch;
        gap: 0.5rem;
      }
      .row {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        border-radius: 0.75rem;
        padding: 0.75rem 0.9rem;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .row.active {
        border-color: var(--accent);
        box-shadow: inset 0 0 0 1px var(--accent);
      }
      .name {
        font-weight: 600;
      }
      .notes {
        color: var(--muted);
        font-variant-numeric: tabular-nums;
        font-size: 0.9rem;
      }
      .row-actions {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .row-actions button {
        border: 1px solid var(--border);
        background: transparent;
        color: var(--muted);
        border-radius: 0.5rem;
        font: inherit;
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
      }
      .add {
        width: 100%;
        margin-top: 1.5rem;
        border: 1px dashed var(--border);
        background: transparent;
        color: var(--text);
        border-radius: 0.75rem;
        padding: 0.85rem;
        font: inherit;
        cursor: pointer;
      }
      button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    `,
  ],
})
export class TuningListPage {
  readonly settings = inject(SettingsStore);
  private readonly router = inject(Router);

  readonly groups = computed(() => {
    const all = this.settings.tunings();
    return [
      { family: 'guitar', label: 'Guitar', tunings: all.filter((t) => t.family === 'guitar') },
      { family: 'bass', label: 'Bass', tunings: all.filter((t) => t.family === 'bass') },
      {
        family: 'ukulele',
        label: 'Ukulele',
        tunings: all.filter((t) => t.family === 'ukulele'),
      },
      {
        family: 'custom',
        label: 'Custom',
        tunings: all.filter((t) => t.family === 'custom'),
      },
    ].filter((group) => group.tunings.length > 0);
  });

  notes(tuning: TuningPreset): string {
    return [...tuning.strings]
      .sort((a, b) => a.order - b.order)
      .map((string) => `${string.note}${string.octave}`)
      .join(' ');
  }

  select(id: string): void {
    this.settings.setTuning(id);
    void this.router.navigate(['/']);
  }

  edit(tuning: TuningPreset): void {
    void this.router.navigate(['/tunings', tuning.id, 'edit']);
  }

  remove(tuning: TuningPreset): void {
    this.settings.deleteCustomTuning(tuning.id);
  }

  add(): void {
    void this.router.navigate(['/tunings/new']);
  }

  back(): void {
    void this.router.navigate(['/']);
  }
}
