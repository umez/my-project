/**
 * Source of the capture AudioWorklet.
 *
 * Shipped as a string and loaded from a Blob URL so the processor needs no
 * separate build entry or asset path. The processor forwards 1024-sample mono
 * frames to the main thread, where they are handed to the pitch worker.
 */
export const CAPTURE_WORKLET_SOURCE = `
class ZemuCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frame = new Float32Array(1024);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }
    const channel = input[0];
    if (!channel) {
      return true;
    }
    for (let i = 0; i < channel.length; i++) {
      this.frame[this.offset] = channel[i];
      this.offset += 1;
      if (this.offset === this.frame.length) {
        this.port.postMessage(this.frame.slice(0));
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('zemu-capture', ZemuCaptureProcessor);
`;

export const FRAME_SIZE = 1024;
