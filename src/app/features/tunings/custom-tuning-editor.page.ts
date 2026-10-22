import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular';
import { NOTE_NAMES, noteToMidi } from '../../core/dsp/notes';
import { makeCustomId } from '../../core/storage/custom-tuning';
import {
  MAX_CUSTOM_STRINGS,
  MIN_CUSTOM_STRINGS,
  type TuningPreset,
} from '../../core/tuning/tuning-model';
import { SettingsStore } from '../../shared/state/settings.store';

interface EditableString {
  readonly note: string;
  readonly octave: number;
}

const DEFAULT_STRINGS: readonly EditableString[] = [
  { note: 'E', octave: 2 },
  { note: 'A', octave: 2 },
  { note: 'D', octave: 3 },
  { note: 'G', octave: 3 },
  { note: 'B', octave: 3 },
  { note: 'E', octave: 4 },
];

@Component({
  selector: 'app-custom-tuning-editor-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonHeader, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar>
        <div class="bar">
          <button class="back" type="button" (click)="cancel()" aria-label="Back to tunings">
            ‹
          </button>
          <h1>{{ isNew() ? 'New tuning' : 'Edit tuning' }}</h1>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main class="editor">
        <label class="field">
          <span>Name</span>
          <input
            type="text"
            maxlength="40"
            [value]="name()"
            (input)="onName($event)"
            placeholder="Open C"
          />
        </label>

        <h2>Strings <span class="hint">thickest first</span></h2>

        <ol class="strings">
          @for (row of rows(); track $index) {
            <li>
              <span class="number">{{ rows().length - $index }}</span>
              <select
                [value]="row.note"
                (change)="onNote($index, $event)"
                [attr.aria-label]="'Note for string ' + (rows().length - $index)"
              >
                @for (note of noteNames; track note) {
                  <option [value]="note" [selected]="note === row.note">{{ note }}</option>
                }
              </select>
              <select
                [value]="row.octave"
                (change)="onOctave($index, $event)"
                [attr.aria-label]="'Octave for string ' + (rows().length - $index)"
              >
                @for (octave of octaves; track octave) {
                  <option [value]="octave" [selected]="octave === row.octave">
                    {{ octave }}
                  </option>
                }
              </select>
              <button
                type="button"
                class="remove"
                (click)="removeRow($index)"
                [disabled]="rows().length <= minStrings"
                [attr.aria-label]="'Remove string ' + (rows().length - $index)"
              >
                ×
              </button>
            </li>
          }
        </ol>

        <button
          type="button"
          class="add"
          (click)="addRow()"
          [disabled]="rows().length >= maxStrings"
        >
          Add string
        </button>

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <div class="actions">
          <button type="button" class="primary" (click)="save()">
            {{ isNew() ? 'Create tuning' : 'Save changes' }}
          </button>
          @if (!isNew()) {
            <button type="button" class="danger" (click)="remove()">Delete</button>
          }
        </div>
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
      .editor {
        max-width: 560px;
        margin: 0 auto;
        padding: 1rem 1.25rem 2.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        color: var(--muted);
        font-size: 0.85rem;
      }
      .field input {
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        border-radius: 0.65rem;
        padding: 0.65rem 0.75rem;
        font: inherit;
        font-size: 1rem;
      }
      h2 {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
        margin: 0.5rem 0 0;
      }
      .hint {
        text-transform: none;
        letter-spacing: 0;
        font-weight: 400;
      }
      .strings {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .strings li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .number {
        width: 1.5rem;
        color: var(--muted);
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      select {
        flex: 1;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        border-radius: 0.65rem;
        padding: 0.6rem 0.5rem;
        font: inherit;
      }
      .remove {
        border: 1px solid var(--border);
        background: transparent;
        color: var(--muted);
        border-radius: 0.5rem;
        width: 2.25rem;
        height: 2.25rem;
        font-size: 1.2rem;
        cursor: pointer;
      }
      .add {
        border: 1px dashed var(--border);
        background: transparent;
        color: var(--text);
        border-radius: 0.65rem;
        padding: 0.6rem;
        font: inherit;
        cursor: pointer;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }
      .actions button {
        flex: 1;
        border-radius: 0.75rem;
        padding: 0.75rem;
        font: inherit;
        cursor: pointer;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
      }
      .actions .primary {
        background: var(--accent);
        border-color: var(--accent);
        color: #04231a;
        font-weight: 600;
      }
      .actions .danger {
        color: var(--danger);
        border-color: var(--danger);
      }
      .error {
        color: var(--danger);
        margin: 0;
      }
      button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      button:focus-visible,
      select:focus-visible,
      input:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    `,
  ],
})
export class CustomTuningEditorPage {
  readonly settings = inject(SettingsStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly noteNames = NOTE_NAMES;
  readonly octaves = Array.from({ length: 9 }, (_, index) => index);
  readonly minStrings = MIN_CUSTOM_STRINGS;
  readonly maxStrings = MAX_CUSTOM_STRINGS;

  readonly isNew = signal(true);
  readonly name = signal('');
  readonly rows = signal<readonly EditableString[]>(DEFAULT_STRINGS);
  readonly error = signal<string | null>(null);

  private editingId = '';

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'new') {
      return;
    }
    const existing = this.settings
      .tunings()
      .find((tuning) => tuning.id === id && !tuning.builtIn);
    if (existing) {
      this.load(existing);
    }
  }

  private load(tuning: TuningPreset): void {
    this.editingId = tuning.id;
    this.isNew.set(false);
    this.name.set(tuning.name);
    this.rows.set(
      [...tuning.strings]
        .sort((a, b) => a.order - b.order)
        .map((string) => ({ note: string.note, octave: string.octave })),
    );
  }

  onName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  onNote(index: number, event: Event): void {
    const note = (event.target as HTMLSelectElement).value;
    this.rows.update((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, note } : row)),
    );
  }

  onOctave(index: number, event: Event): void {
    const octave = Number((event.target as HTMLSelectElement).value);
    this.rows.update((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, octave } : row)),
    );
  }

  addRow(): void {
    if (this.rows().length >= MAX_CUSTOM_STRINGS) {
      return;
    }
    this.rows.update((rows) => [...rows, { note: 'E', octave: 2 }]);
  }

  removeRow(index: number): void {
    if (this.rows().length <= MIN_CUSTOM_STRINGS) {
      return;
    }
    this.rows.update((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  }

  save(): void {
    const name = this.name().trim();
    if (!name) {
      this.error.set('Give the tuning a name.');
      return;
    }
    if (name.length > 40) {
      this.error.set('Keep the name to 40 characters or fewer.');
      return;
    }
    if (this.settings.isNameTaken(name, this.editingId)) {
      this.error.set('Another tuning already uses that name.');
      return;
    }
    if (this.rows().length < MIN_CUSTOM_STRINGS || this.rows().length > MAX_CUSTOM_STRINGS) {
      this.error.set(
        `A tuning needs between ${MIN_CUSTOM_STRINGS} and ${MAX_CUSTOM_STRINGS} strings.`,
      );
      return;
    }

    for (const row of this.rows()) {
      try {
        const midi = noteToMidi(row.note, row.octave);
        if (midi < 0 || midi > 127) {
          throw new Error('out of range');
        }
      } catch {
        this.error.set(`The note ${row.note}${row.octave} is not valid.`);
        return;
      }
    }

    const id =
      this.editingId || makeCustomId(this.settings.customTunings());
    this.settings.saveCustomTuning({
      id,
      name,
      strings: this.rows(),
    });
    void this.router.navigate(['/tunings']);
  }

  remove(): void {
    if (this.editingId) {
      this.settings.deleteCustomTuning(this.editingId);
    }
    void this.router.navigate(['/tunings']);
  }

  cancel(): void {
    void this.router.navigate(['/tunings']);
  }
}
