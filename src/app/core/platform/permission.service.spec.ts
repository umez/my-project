import { describe, expect, it } from 'vitest';
import {
  classifyAudioError,
  MICROPHONE_CONSTRAINTS,
  PERMISSION_MESSAGES,
} from './permission.service';

describe('audio error classification', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'unavailable'],
    ['OverconstrainedError', 'unavailable'],
    ['NotReadableError', 'busy'],
    ['AbortError', 'busy'],
  ] as const)('maps %s to %s', (name, reason) => {
    const failure = classifyAudioError(new DOMException('nope', name));
    expect(failure.reason).toBe(reason);
    expect(failure.message).toBe(PERMISSION_MESSAGES[reason]);
  });

  it('falls back to unsupported for unknown failures', () => {
    expect(classifyAudioError(new Error('boom')).reason).toBe('unsupported');
    expect(classifyAudioError(null).reason).toBe('unsupported');
  });

  it('disables audio processing that would distort pitch', () => {
    expect(MICROPHONE_CONSTRAINTS.echoCancellation).toBe(false);
    expect(MICROPHONE_CONSTRAINTS.noiseSuppression).toBe(false);
    expect(MICROPHONE_CONSTRAINTS.autoGainControl).toBe(false);
  });
});
