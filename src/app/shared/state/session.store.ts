/**
 * Session state machine and reading pipeline.
 *
 * Capture -> pitch estimate -> target selection -> smoothing -> view model.
 * The UI renders `reading` only; it never computes pitch math itself.
 */

import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { AudioCaptureService } from '../../core/audio/audio-capture.service';
import { hzFromMidi, offsetCents } from '../../core/dsp/cents';
import { formatMidi } from '../../core/dsp/notes';
import { PitchSmoother } from '../../core/dsp/smoother';
import { LifecycleService } from '../../core/platform/lifecycle.service';
import { PermissionService } from '../../core/platform/permission.service';
import { ChromaticSelector } from '../../core/tuning/chromatic-selector';
import { rankStrings, TargetSelector } from '../../core/tuning/target-selector';
import type { TuningString } from '../../core/tuning/tuning-model';
import { SettingsStore } from './settings.store';

export type TunerStatus =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'reading'
  | 'between'
  | 'denied'
  | 'error';

export type TunerLabel = 'Flat' | 'Sharp' | 'In tune' | 'Between strings' | 'Listening';

export interface CandidateView {
  readonly note: string;
  readonly octave: number;
  readonly stringNumber: number | null;
  readonly cents: number;
}

export interface TunerReading {
  readonly status: TunerStatus;
  readonly note: string | null;
  readonly octave: number | null;
  readonly frequencyHz: number | null;
  readonly targetHz: number | null;
  readonly cents: number | null;
  readonly label: TunerLabel;
  readonly stringNumber: number | null;
  readonly candidates: readonly CandidateView[];
  readonly hint: string | null;
}

const EMPTY: Omit<TunerReading, 'status' | 'label'> = {
  note: null,
  octave: null,
  frequencyHz: null,
  targetHz: null,
  cents: null,
  stringNumber: null,
  candidates: [],
  hint: null,
};

const IDLE_READING: TunerReading = { ...EMPTY, status: 'idle', label: 'Listening' };
const LISTENING_READING: TunerReading = { ...EMPTY, status: 'listening', label: 'Listening' };

function labelFor(cents: number, toleranceCents: number): TunerLabel {
  if (Math.abs(cents) <= toleranceCents) {
    return 'In tune';
  }
  return cents > 0 ? 'Sharp' : 'Flat';
}

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly audio = inject(AudioCaptureService);
  private readonly permissions = inject(PermissionService);
  private readonly settings = inject(SettingsStore);
  private readonly lifecycle = inject(LifecycleService);
  private readonly router = inject(Router);

  private readonly selector = new TargetSelector();
  private readonly chromatic = new ChromaticSelector();
  private readonly smoother = new PitchSmoother();

  private lastKey = '';
  private lastAutoOrder: number | null = null;
  private lastChromaticMidi: number | null = null;

  readonly reading = signal<TunerReading>(IDLE_READING);
  readonly hasRequestedPermission = signal(false);
  /** True only between tapping Start and confirming/cancelling the rationale. */
  readonly rationalePending = signal(false);
  readonly capturing = this.audio.capturing;
  readonly failure = this.permissions.failure;
  readonly status = computed(() => this.reading().status);

  constructor() {
    effect(() => {
      const estimate = this.audio.estimate();
      const capturing = this.audio.capturing();
      const state = this.settings.state();
      const tuning = this.settings.activeTuning();
      const referenceHz = state.referenceHz;

      const key = [
        state.mode,
        tuning.id,
        referenceHz,
        state.manualStringOrder,
        state.toleranceCents,
      ].join('|');
      if (key !== this.lastKey) {
        this.lastKey = key;
        this.selector.reset();
        this.chromatic.reset();
        this.smoother.reset();
        this.lastAutoOrder = null;
        this.lastChromaticMidi = null;
      }

      if (!capturing) {
        this.reading.set(IDLE_READING);
        return;
      }
      if (!estimate) {
        this.reading.set(LISTENING_READING);
        return;
      }

      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const frequencyHz = estimate.frequencyHz;

      if (state.mode === 'chromatic') {
        this.updateChromatic(frequencyHz, referenceHz, state.toleranceCents);
        return;
      }

      if (state.mode === 'manual') {
        this.updateManual(frequencyHz, referenceHz, state.toleranceCents, tuning.strings);
        return;
      }

      this.updateAuto(
        frequencyHz,
        referenceHz,
        state.toleranceCents,
        tuning.strings,
        now,
      );
    });

    this.lifecycle.start();
    this.lifecycle.onBackground(() => {
      void this.stop();
    });

    // Ionic caches routed pages, so ngOnDestroy is not guaranteed on navigation.
    // Release the microphone whenever the tuner is left.
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart && event.url !== '/' && this.audio.capturing()) {
        void this.stop();
      }
    });
  }

  /** First call reveals the rationale; the user then explicitly confirms. */
  requestStart(): void {
    if (!this.hasRequestedPermission()) {
      this.hasRequestedPermission.set(true);
      this.rationalePending.set(true);
      return;
    }
    void this.start();
  }

  async start(): Promise<void> {
    this.hasRequestedPermission.set(true);
    this.rationalePending.set(false);
    this.reading.set({ ...EMPTY, status: 'requesting', label: 'Listening' });
    const started = await this.audio.start();
    if (!started) {
      const failure = this.permissions.failure();
      this.reading.set({
        ...EMPTY,
        status: failure?.reason === 'denied' ? 'denied' : 'error',
        label: 'Listening',
      });
    }
  }

  async stop(): Promise<void> {
    await this.audio.stop();
    this.reading.set(IDLE_READING);
  }

  dismissRationale(): void {
    this.rationalePending.set(false);
    this.hasRequestedPermission.set(false);
  }

  private updateAuto(
    frequencyHz: number,
    referenceHz: number,
    toleranceCents: number,
    strings: readonly TuningString[],
    nowMs: number,
  ): void {
    const selection = this.selector.update(frequencyHz, referenceHz, strings, nowMs);

    if (selection.ambiguous) {
      this.smoother.reset();
      this.lastAutoOrder = null;
      this.reading.set({
        ...EMPTY,
        status: 'between',
        label: 'Between strings',
        frequencyHz,
        candidates: selection.candidates.slice(0, 2).map((candidate) => ({
          note: candidate.string.note,
          octave: candidate.string.octave,
          stringNumber: candidate.string.stringNumber,
          cents: offsetCents(frequencyHz, candidate.targetHz),
        })),
      });
      return;
    }

    const selected = selection.selected;
    if (!selected) {
      this.reading.set(LISTENING_READING);
      return;
    }

    if (this.lastAutoOrder !== selected.string.order) {
      this.smoother.reset();
      this.lastAutoOrder = selected.string.order;
    }

    const cents = this.smoother.push(offsetCents(frequencyHz, selected.targetHz));
    this.reading.set(
      this.readingFor(
        selected.string.note,
        selected.string.octave,
        selected.string.stringNumber,
        selected.targetHz,
        cents,
        toleranceCents,
      ),
    );
  }

  private updateManual(
    frequencyHz: number,
    referenceHz: number,
    toleranceCents: number,
    strings: readonly TuningString[],
  ): void {
    const string = this.settings.manualString();
    if (!string) {
      this.reading.set(LISTENING_READING);
      return;
    }

    const targetHz = hzFromMidi(string.midi, referenceHz);
    const rawCents = offsetCents(frequencyHz, targetHz);
    const cents = this.smoother.push(rawCents);

    let hint: string | null = null;
    if (Math.abs(rawCents) > 100) {
      const nearest = rankStrings(frequencyHz, referenceHz, strings).find(
        (candidate) => candidate.string.order !== string.order,
      );
      if (nearest) {
        hint = `Nearest string is ${formatMidi(nearest.string.midi)}`;
      }
    }

    this.reading.set({
      ...this.readingFor(
        string.note,
        string.octave,
        string.stringNumber,
        targetHz,
        cents,
        toleranceCents,
      ),
      hint,
    });
  }

  private updateChromatic(
    frequencyHz: number,
    referenceHz: number,
    toleranceCents: number,
  ): void {
    const note = this.chromatic.update(frequencyHz, referenceHz);

    if (this.lastChromaticMidi !== note.midi) {
      this.smoother.reset();
      this.lastChromaticMidi = note.midi;
    }

    const cents = this.smoother.push(note.cents);
    this.reading.set(
      this.readingFor(
        note.note,
        note.octave,
        null,
        note.targetHz,
        cents,
        toleranceCents,
      ),
    );
  }

  private readingFor(
    note: string,
    octave: number,
    stringNumber: number | null,
    targetHz: number,
    cents: number,
    toleranceCents: number,
  ): TunerReading {
    const frequencyHz = targetHz * Math.pow(2, cents / 1200);
    return {
      status: 'reading',
      note,
      octave,
      frequencyHz,
      targetHz,
      cents,
      label: labelFor(cents, toleranceCents),
      stringNumber,
      candidates: [],
      hint: null,
    };
  }
}
