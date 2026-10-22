/**
 * Application settings store.
 *
 * Wraps `StateRepository` in signals. Every setter validates and persists via
 * the repository; the UI never talks to storage directly.
 */

import { computed, effect, Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ALL_PRESETS, GUITAR_STANDARD } from '../../core/tuning/presets';
import type { TuningMode, TuningPreset, TuningString } from '../../core/tuning/tuning-model';
import { customToPreset } from '../../core/storage/custom-tuning';
import {
  DEFAULT_STATE,
  MAX_TOLERANCE_CENTS,
  MIN_TOLERANCE_CENTS,
  type AppState,
  type CustomTuning,
  type ThemeName,
} from '../../core/storage/persisted-state';
import {
  createDefaultStore,
  PreferencesStore,
  StateRepository,
} from '../../core/storage/state.repository';
import { MAX_REFERENCE_HZ, MIN_REFERENCE_HZ } from '../../core/dsp/cents';

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly repository = new StateRepository(
    Capacitor.isNativePlatform() ? new PreferencesStore() : createDefaultStore(),
  );

  readonly state = signal<AppState>(DEFAULT_STATE);

  readonly referenceHz = computed(() => this.state().referenceHz);
  readonly toleranceCents = computed(() => this.state().toleranceCents);
  readonly theme = computed(() => this.state().theme);
  readonly mode = computed(() => this.state().mode);
  readonly customTunings = computed(() => this.state().customTunings);

  readonly tunings = computed<readonly TuningPreset[]>(() => [
    ...ALL_PRESETS,
    ...this.state().customTunings.map(customToPreset),
  ]);

  readonly activeTuning = computed<TuningPreset>(() => {
    const id = this.state().tuningId;
    return this.tunings().find((tuning) => tuning.id === id) ?? GUITAR_STANDARD;
  });

  readonly manualString = computed<TuningString | null>(() => {
    const tuning = this.activeTuning();
    const order = this.state().manualStringOrder ?? tuning.strings[0]?.order ?? 0;
    return tuning.strings.find((string) => string.order === order) ?? tuning.strings[0] ?? null;
  });

  private initialized = false;

  constructor() {
    this.repository.subscribe((state) => this.state.set(state));
    effect(() => {
      const theme = this.state().theme;
      if (typeof document !== 'undefined') {
        document.documentElement.dataset['theme'] = theme;
      }
    });
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    await this.repository.load();
  }

  setReferenceHz(value: number): void {
    const clamped = Math.min(MAX_REFERENCE_HZ, Math.max(MIN_REFERENCE_HZ, Math.round(value)));
    this.repository.update({ referenceHz: clamped });
  }

  setToleranceCents(value: number): void {
    const clamped = Math.min(
      MAX_TOLERANCE_CENTS,
      Math.max(MIN_TOLERANCE_CENTS, Math.round(value)),
    );
    this.repository.update({ toleranceCents: clamped });
  }

  setTheme(theme: ThemeName): void {
    this.repository.update({ theme });
  }

  setMode(mode: TuningMode): void {
    this.repository.update({ mode });
  }

  setTuning(id: string): void {
    this.repository.update({ tuningId: id });
  }

  setManualString(order: number): void {
    this.repository.update({ manualStringOrder: order });
  }

  isNameTaken(name: string, exceptId: string): boolean {
    const normalized = name.trim().toLocaleLowerCase();
    return this.tunings().some(
      (tuning) =>
        tuning.id !== exceptId && tuning.name.trim().toLocaleLowerCase() === normalized,
    );
  }

  saveCustomTuning(custom: CustomTuning): void {
    const existing = this.state().customTunings;
    const index = existing.findIndex((tuning) => tuning.id === custom.id);
    const next =
      index >= 0
        ? existing.map((tuning) => (tuning.id === custom.id ? custom : tuning))
        : [...existing, custom];
    this.repository.update({ customTunings: next, tuningId: custom.id });
  }

  deleteCustomTuning(id: string): void {
    this.repository.update({
      customTunings: this.state().customTunings.filter((tuning) => tuning.id !== id),
      tuningId: this.state().tuningId === id ? GUITAR_STANDARD.id : this.state().tuningId,
    });
  }

  async flush(): Promise<void> {
    await this.repository.flush();
  }
}
