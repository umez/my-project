/**
 * Pitch worker: assembles a sliding 4096-sample window from 1024-sample frames
 * and runs `analyzeFrame`. Keeps detection off the UI thread.
 */

import { analyzeFrame, DEFAULT_FRAME_SIZE, type PitchEstimate } from '../dsp/pitch-detector';

interface FrameMessage {
  readonly type: 'frame';
  readonly samples: Float32Array;
  readonly sampleRate: number;
}

interface EstimateMessage {
  readonly type: 'estimate';
  readonly estimate: PitchEstimate | null;
}

interface WorkerScope {
  onmessage: ((event: MessageEvent<FrameMessage>) => void) | null;
  postMessage(message: EstimateMessage): void;
}

const scope = self as unknown as WorkerScope;
const window = new Float32Array(DEFAULT_FRAME_SIZE);
let filled = 0;

scope.onmessage = (event: MessageEvent<FrameMessage>): void => {
  const message = event.data;
  if (message.type !== 'frame') {
    return;
  }

  const samples = message.samples;
  if (samples.length >= DEFAULT_FRAME_SIZE) {
    window.set(samples.subarray(samples.length - DEFAULT_FRAME_SIZE));
    filled = DEFAULT_FRAME_SIZE;
  } else {
    window.copyWithin(0, samples.length);
    window.set(samples, DEFAULT_FRAME_SIZE - samples.length);
    filled = Math.min(DEFAULT_FRAME_SIZE, filled + samples.length);
  }

  if (filled < DEFAULT_FRAME_SIZE) {
    return;
  }

  scope.postMessage({ type: 'estimate', estimate: analyzeFrame(window, message.sampleRate) });
};
