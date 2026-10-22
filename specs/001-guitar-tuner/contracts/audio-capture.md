# Contract: Audio Capture

**Module**: `src/app/core/audio/audio-capture.service.ts` (framework-aware service),
`src/app/core/audio/capture-worklet.ts`, `src/app/core/audio/pitch.worker.ts`
**Consumers**: tuner page, lifecycle service, E2E and unit tests
**Type**: Service with an explicit start/stop lifecycle. The worklet and worker are internal.

## Interface

```ts
export type CaptureErrorReason =
  | 'denied'
  | 'unavailable'
  | 'busy'
  | 'unsupported';

export interface AudioCapture {
  /** Requests permission if needed, opens the context, starts frame emission. */
  start(): Promise<void>;
  /** Stops emission, releases the device, closes the context. Idempotent. */
  stop(): Promise<void>;
  /** Emitted frames, 1024 samples each, already validated for size. */
  readonly frames: Observable<Float32Array>;
  readonly isCapturing: Signal<boolean>;
}
```

## Start Sequence (must be this order)

1. Emit that a session is starting (UI shows the rationale screen before this call).
2. `getUserMedia` with exactly:
   ```ts
   { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }
   ```
3. Create `AudioContext` (target sample rate 48 kHz, `latencyHint: 'interactive'`).
4. `audioWorklet.addModule()` for the capture processor.
5. Connect `MediaStreamAudioSourceNode → AudioWorkletNode`; route the node to a zero-gain
   destination so the graph runs without audible monitoring.
6. Start the worker and forward 1024-sample frames.
7. Resolve `start()` only after the first frame has been received.

If any step rejects, all previously acquired resources are released before the error surfaces.

## Stop Sequence (must be this order)

1. Stop forwarding frames.
2. Disconnect the worklet node and the source node.
3. Call `track.stop()` on every track in every stream.
4. Close the `AudioContext` (`await context.close()`).
5. Terminate the worker.
6. Resolve `stop()`; no further frames may be emitted.

`stop()` is idempotent and must complete within 1 second.

## Trigger Matrix

| Trigger | Source | Required behavior |
| --- | --- | --- |
| User taps Stop | tuner page | `stop()` |
| Route change away from tuner | Angular router | `stop()` |
| App goes background/inactive | `@capacitor/app` `appStateChange` | `stop()` |
| Web tab hidden | `document.visibilitychange` → `hidden` | `stop()` |
| OS interrupts capture (call, other app) | track `ended` / `mute` | `stop()` and surface `busy` |
| Screen locked | `appStateChange` | `stop()` |

Returning from any of these leaves the session `idle`; capture never resumes automatically.

## Error Mapping

| Browser/Capacitor error | `CaptureErrorReason` | User-facing meaning |
| --- | --- | --- |
| `NotAllowedError`, `SecurityError` | `denied` | Permission refused or blocked by policy |
| `NotFoundError`, `OverconstrainedError` | `unavailable` | No usable microphone |
| `NotReadableError`, `AbortError` | `busy` | Device held by another app |
| Missing `navigator.mediaDevices` or `AudioWorklet` | `unsupported` | Platform cannot capture |

## Frame Contract

- 1024 samples per message, `Float32Array`, values −1..1.
- Monotonic timestamp attached by the worklet (context time, seconds).
- Frames are transferred (not copied) via `postMessage` with a transfer list.
- The worker assembles a 4096-sample sliding window; the last valid reading may be reused for
  at most 300 ms before the UI clears it.
- No frame is stored, written to disk, or sent over a network. Buffers are reused.

## Test Doubles

- Unit tests inject a fake `navigator.mediaDevices` returning a synthetic `MediaStream` and a
  fake `AudioContext`, and assert the teardown call order.
- Playwright uses Chrome's `--use-fake-device-for-media-stream` plus
  `--use-file-for-fake-audio-capture=tests/fixtures/e2.wav` to exercise the real path.

## Invariants

1. `isCapturing` is false before `start()` and after `stop()` resolves.
2. No microphone track remains live once `stop()` resolves.
3. `start()` called while capturing is rejected (or returns without duplicating tracks); it must
   never open a second stream.
4. A failed `start()` leaves no live tracks, no open context, and no running worker.
5. The service never requests permission at construction time.
