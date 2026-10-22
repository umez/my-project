/**
 * Microphone capture pipeline:
 *   getUserMedia -> AudioWorklet (1024-sample frames) -> pitch worker.
 *
 * No audio is recorded, buffered beyond the analysis window, converted to a
 * file, or sent anywhere. `stop()` tears down every node and track.
 */

import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import type { PitchEstimate } from '../dsp/pitch-detector';
import { PERMISSION_MESSAGES, PermissionService } from '../platform/permission.service';
import { CAPTURE_WORKLET_SOURCE } from './capture-worklet';

@Injectable({ providedIn: 'root' })
export class AudioCaptureService implements OnDestroy {
  private readonly permissions = inject(PermissionService);

  /** Latest worker estimate; null when the frame was unusable. */
  readonly estimate = signal<PitchEstimate | null>(null);
  readonly capturing = signal(false);

  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private mute: GainNode | null = null;
  private worker: Worker | null = null;
  private starting = false;
  private releasing = false;

  async start(): Promise<boolean> {
    if (this.capturing()) {
      return true;
    }
    if (this.starting) {
      return false;
    }

    this.starting = true;
    this.permissions.clearFailure();

    try {
      const stream = await this.permissions.openStream();
      this.stream = stream;
      for (const track of stream.getAudioTracks()) {
        track.addEventListener('ended', this.handleTrackEnded);
      }

      const context = this.createContext();
      this.context = context;
      if (context.state === 'suspended') {
        await context.resume();
      }

      const moduleUrl = URL.createObjectURL(
        new Blob([CAPTURE_WORKLET_SOURCE], { type: 'application/javascript' }),
      );
      try {
        await context.audioWorklet.addModule(moduleUrl);
      } finally {
        URL.revokeObjectURL(moduleUrl);
      }

      const source = context.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(context, 'zemu-capture', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      });
      // A zero-gain sink keeps the node pulled without producing sound.
      const mute = context.createGain();
      mute.gain.value = 0;
      source.connect(worklet);
      worklet.connect(mute);
      mute.connect(context.destination);

      const worker = new Worker(new URL('./pitch.worker', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (event: MessageEvent<{ type: string; estimate: PitchEstimate | null }>) => {
        if (event.data?.type === 'estimate') {
          this.estimate.set(event.data.estimate);
        }
      };
      worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
        const samples = event.data;
        worker.postMessage(
          { type: 'frame', samples, sampleRate: context.sampleRate },
          [samples.buffer],
        );
      };

      this.source = source;
      this.worklet = worklet;
      this.mute = mute;
      this.worker = worker;
      this.capturing.set(true);
      return true;
    } catch {
      // PermissionService records classified getUserMedia failures. Any later
      // failure (AudioWorklet, worker, context) still needs a visible reason.
      if (!this.permissions.failure()) {
        this.permissions.reportFailure({
          reason: 'unsupported',
          message: PERMISSION_MESSAGES.unsupported,
        });
      }
      await this.release();
      return false;
    } finally {
      this.starting = false;
    }
  }

  async stop(): Promise<void> {
    await this.release();
  }

  private createContext(): AudioContext {
    try {
      return new AudioContext({ latencyHint: 'interactive', sampleRate: 48_000 });
    } catch {
      return new AudioContext({ latencyHint: 'interactive' });
    }
  }

  private readonly handleTrackEnded = (): void => {
    if (!this.releasing) {
      void this.stop();
    }
  };

  private async release(): Promise<void> {
    this.releasing = true;
    this.capturing.set(false);
    this.estimate.set(null);

    try {
      this.worklet?.port.close();
    } catch {
      // Ignore already-closed ports.
    }
    this.worklet?.disconnect();
    this.source?.disconnect();
    this.mute?.disconnect();
    this.worker?.terminate();

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.removeEventListener('ended', this.handleTrackEnded);
        track.stop();
      }
    }

    if (this.context && this.context.state !== 'closed') {
      try {
        await this.context.close();
      } catch {
        // Closing an already-closed context is harmless.
      }
    }

    this.worklet = null;
    this.source = null;
    this.mute = null;
    this.worker = null;
    this.stream = null;
    this.context = null;
    this.releasing = false;
  }

  readonly failure = (): ReturnType<PermissionService['failure']> => this.permissions.failure();

  ngOnDestroy(): void {
    void this.stop();
  }
}
