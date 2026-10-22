import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { AppSettings } from '../../core/platform/app-settings.plugin';
import type { TuningMode } from '../../core/tuning/tuning-model';
import { SessionStore } from '../../shared/state/session.store';
import { SettingsStore } from '../../shared/state/settings.store';
import { ModeSelectorComponent } from './mode-selector.component';
import { NeedleGaugeComponent } from './needle-gauge.component';
import { PitchReadoutComponent } from './pitch-readout.component';
import { StringSelectorComponent } from './string-selector.component';

@Component({
  selector: 'app-tuner-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    NeedleGaugeComponent,
    PitchReadoutComponent,
    ModeSelectorComponent,
    StringSelectorComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Zemu Tuner</ion-title>
        <div class="header-actions" slot="end">
          <button type="button" (click)="open('/tunings')">Tunings</button>
          <button type="button" (click)="open('/settings')">Settings</button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main class="tuner">
        <p class="tuning">
          {{ settings.activeTuning().name }} · A4 {{ settings.referenceHz() }} Hz
        </p>

        <app-needle-gauge
          [cents]="reading().cents"
          [tolerance]="settings.toleranceCents()"
          [status]="reading().status"
        />

        <app-pitch-readout [reading]="reading()" />

        <app-mode-selector [value]="settings.mode()" (valueChange)="setMode($event)" />

        @if (settings.mode() !== 'chromatic') {
          <app-string-selector
            [strings]="settings.activeTuning().strings"
            [selectedOrder]="selectedOrder()"
            (orderChange)="selectString($event)"
          />
        }

        @if (showRationale()) {
          <section class="notice" aria-labelledby="mic-title">
            <h2 id="mic-title">Microphone access</h2>
            <p>
              Zemu Guitar Tuner listens only while you are tuning. Audio is analysed on this
              device and is never recorded, stored, or sent anywhere.
            </p>
            <div class="actions">
              <button class="primary" type="button" (click)="confirmStart()">
                Allow microphone
              </button>
              <button type="button" (click)="session.dismissRationale()">Not now</button>
            </div>
          </section>
        }

        @if (failure(); as problem) {
          <section class="notice error" role="alert">
            <p>{{ problem.message }}</p>
            <div class="actions">
              @if (isNative) {
                <button type="button" (click)="openSettings()">Open settings</button>
              }
              <button class="primary" type="button" (click)="start()">Try again</button>
            </div>
          </section>
        }

        <button
          class="capture"
          type="button"
          [class.stop]="session.capturing()"
          [attr.aria-pressed]="session.capturing()"
          (click)="toggle()"
        >
          {{ session.capturing() ? 'Stop' : 'Start' }}
        </button>

        <p class="privacy">On-device audio · No account · Works offline</p>
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
      .header-actions {
        display: flex;
        gap: 0.25rem;
        padding-inline-end: 0.5rem;
      }
      .header-actions button {
        background: transparent;
        border: 0;
        color: var(--text);
        font: inherit;
        font-size: 0.9rem;
        padding: 0.5rem;
        cursor: pointer;
      }
      .header-actions button:focus-visible {
        outline: 2px solid var(--accent);
        border-radius: 4px;
      }
      ion-content {
        --background: var(--bg);
      }
      .tuner {
        max-width: 560px;
        margin: 0 auto;
        padding: 1rem 1.25rem 2.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .tuning {
        text-align: center;
        color: var(--muted);
        margin: 0;
        font-size: 0.95rem;
      }
      .notice {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 1rem;
        padding: 1rem 1.1rem;
      }
      .notice h2 {
        margin: 0 0 0.4rem;
        font-size: 1.05rem;
      }
      .notice p {
        margin: 0 0 0.75rem;
        color: var(--muted);
        line-height: 1.45;
      }
      .notice.error {
        border-color: var(--danger);
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .actions button {
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        border-radius: 0.65rem;
        padding: 0.55rem 0.9rem;
        font: inherit;
        cursor: pointer;
      }
      .actions button.primary {
        background: var(--accent);
        border-color: var(--accent);
        color: #04231a;
        font-weight: 600;
      }
      .capture {
        border: 0;
        border-radius: 999px;
        background: var(--accent);
        color: #04231a;
        font: inherit;
        font-size: 1.25rem;
        font-weight: 700;
        padding: 0.9rem 2rem;
        cursor: pointer;
        min-height: 3.25rem;
      }
      .capture.stop {
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
      }
      .capture:focus-visible {
        outline: 3px solid var(--accent);
        outline-offset: 3px;
      }
      .privacy {
        text-align: center;
        color: var(--muted);
        font-size: 0.8rem;
        margin: 0;
      }
    `,
  ],
})
export class TunerPage implements OnDestroy {
  readonly settings = inject(SettingsStore);
  readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  readonly reading = this.session.reading;
  readonly failure = this.session.failure;
  readonly isNative = Capacitor.isNativePlatform();

  readonly showRationale = computed(() => this.session.rationalePending());

  readonly selectedOrder = computed(() =>
    this.settings.mode() === 'manual' ? (this.settings.manualString()?.order ?? null) : null,
  );

  setMode(mode: TuningMode): void {
    this.settings.setMode(mode);
    if (mode === 'manual' && this.settings.manualString() === null) {
      this.settings.setManualString(0);
    }
  }

  selectString(order: number): void {
    this.settings.setMode('manual');
    this.settings.setManualString(order);
  }

  toggle(): void {
    if (this.session.capturing()) {
      void this.session.stop();
    } else {
      this.session.requestStart();
    }
  }

  confirmStart(): void {
    void this.session.start();
  }

  start(): void {
    void this.session.start();
  }

  open(path: string): void {
    void this.router.navigate([path]);
  }

  async openSettings(): Promise<void> {
    try {
      await AppSettings.open();
    } catch {
      // Web fallback: the inline message already explains what to change.
    }
  }

  ngOnDestroy(): void {
    void this.session.stop();
  }
}
