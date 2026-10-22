/**
 * Microphone permission handling and the four-reason audio failure taxonomy.
 */

import { Injectable, signal } from '@angular/core';

export type MicrophonePermission = 'unknown' | 'granted' | 'denied' | 'unavailable';
export type AudioFailureReason = 'denied' | 'unavailable' | 'busy' | 'unsupported';

export interface AudioFailure {
  readonly reason: AudioFailureReason;
  readonly message: string;
}

export const PERMISSION_MESSAGES: Readonly<Record<AudioFailureReason, string>> = {
  denied:
    'Microphone access is blocked. Allow microphone access for Zemu Guitar Tuner in your device settings, then tap Start again.',
  unavailable: 'No microphone was found. Connect a microphone or check your device audio settings.',
  busy: 'The microphone is being used by another app. Close the other app and try again.',
  unsupported: 'This browser or device does not support microphone capture. Try a recent Chrome, Safari, or the installed app.',
};

export function classifyAudioError(error: unknown): AudioFailure {
  const name = error instanceof DOMException ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return { reason: 'denied', message: PERMISSION_MESSAGES.denied };
    case 'NotFoundError':
    case 'OverconstrainedError':
      return { reason: 'unavailable', message: PERMISSION_MESSAGES.unavailable };
    case 'NotReadableError':
    case 'AbortError':
      return { reason: 'busy', message: PERMISSION_MESSAGES.busy };
    default:
      return { reason: 'unsupported', message: PERMISSION_MESSAGES.unsupported };
  }
}

export const MICROPHONE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
};

@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly state = signal<MicrophonePermission>('unknown');
  readonly failure = signal<AudioFailure | null>(null);

  supportsCapture(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    );
  }

  async openStream(): Promise<MediaStream> {
    if (!this.supportsCapture()) {
      const failure: AudioFailure = {
        reason: 'unsupported',
        message: PERMISSION_MESSAGES.unsupported,
      };
      this.failure.set(failure);
      throw failure;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: MICROPHONE_CONSTRAINTS,
        video: false,
      });
      this.state.set('granted');
      this.failure.set(null);
      return stream;
    } catch (error) {
      const failure = classifyAudioError(error);
      this.state.set(failure.reason === 'denied' ? 'denied' : 'unavailable');
      this.failure.set(failure);
      throw failure;
    }
  }

  clearFailure(): void {
    this.failure.set(null);
  }

  reportFailure(failure: AudioFailure): void {
    this.failure.set(failure);
    this.state.set(failure.reason === 'denied' ? 'denied' : 'unavailable');
  }
}
