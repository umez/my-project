import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular';
import type { ThemeName } from '../../core/storage/persisted-state';
import { SettingsStore } from '../../shared/state/settings.store';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonHeader, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar>
        <div class="bar">
          <button class="back" type="button" (click)="back()" aria-label="Back to tuner">‹</button>
          <h1>Settings</h1>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main class="settings">
        <section class="card">
          <label class="field" for="reference">
            <span class="title">Reference pitch</span>
            <span class="value">{{ settings.referenceHz() }} Hz</span>
          </label>
          <input
            id="reference"
            type="range"
            min="415"
            max="466"
            step="1"
            [value]="settings.referenceHz()"
            (input)="onReference($event)"
          />
          <div class="presets">
            @for (preset of referencePresets; track preset) {
              <button
                type="button"
                [class.active]="settings.referenceHz() === preset"
                (click)="settings.setReferenceHz(preset)"
              >
                {{ preset }}
              </button>
            }
          </div>
          <p class="help">A4 tuning reference, from 415 to 466 Hz. Standard is 440 Hz.</p>
        </section>

        <section class="card">
          <label class="field" for="tolerance">
            <span class="title">In-tune tolerance</span>
            <span class="value">±{{ settings.toleranceCents() }} ¢</span>
          </label>
          <input
            id="tolerance"
            type="range"
            min="1"
            max="50"
            step="1"
            [value]="settings.toleranceCents()"
            (input)="onTolerance($event)"
          />
          <p class="help">
            How close a reading must be before it counts as "In tune". Smaller values are
            stricter.
          </p>
        </section>

        <section class="card">
          <span class="title">Theme</span>
          <div class="theme">
            <button
              type="button"
              [class.active]="settings.theme() === 'light'"
              (click)="setTheme('light')"
            >
              Light
            </button>
            <button
              type="button"
              [class.active]="settings.theme() === 'dark'"
              (click)="setTheme('dark')"
            >
              Dark
            </button>
          </div>
        </section>

        <section class="card privacy">
          <span class="title">Privacy</span>
          <p class="help">
            Audio is analysed on this device only. Nothing is recorded, stored, or uploaded,
            and the app has no account or network sync. The microphone is released when you
            stop or leave the app.
          </p>
          <p class="help">Zemu Guitar Tuner · version 0.1.0</p>
        </section>
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
      .settings {
        max-width: 560px;
        margin: 0 auto;
        padding: 1rem 1.25rem 2.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 1rem;
        padding: 1rem 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .field {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 1rem;
      }
      .title {
        font-weight: 600;
      }
      .value {
        color: var(--muted);
        font-variant-numeric: tabular-nums;
      }
      input[type='range'] {
        width: 100%;
        accent-color: var(--accent);
      }
      .presets,
      .theme {
        display: flex;
        gap: 0.5rem;
      }
      .presets button,
      .theme button {
        flex: 1;
        border: 1px solid var(--border);
        background: transparent;
        color: var(--text);
        border-radius: 0.6rem;
        padding: 0.45rem;
        font: inherit;
        cursor: pointer;
      }
      .presets button.active,
      .theme button.active {
        border-color: var(--accent);
        box-shadow: inset 0 0 0 1px var(--accent);
        font-weight: 600;
      }
      .help {
        color: var(--muted);
        font-size: 0.85rem;
        line-height: 1.45;
        margin: 0;
      }
      button:focus-visible,
      input:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    `,
  ],
})
export class SettingsPage {
  readonly settings = inject(SettingsStore);
  private readonly router = inject(Router);

  readonly referencePresets = [432, 440, 442] as const;

  onReference(event: Event): void {
    this.settings.setReferenceHz(Number((event.target as HTMLInputElement).value));
  }

  onTolerance(event: Event): void {
    this.settings.setToleranceCents(Number((event.target as HTMLInputElement).value));
  }

  setTheme(theme: ThemeName): void {
    this.settings.setTheme(theme);
  }

  back(): void {
    void this.router.navigate(['/']);
  }
}
