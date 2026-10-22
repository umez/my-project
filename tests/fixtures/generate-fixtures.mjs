/**
 * Deterministic audio fixtures for Playwright's fake capture device.
 *
 * Usage: node tests/fixtures/generate-fixtures.mjs
 * Writes 16-bit mono 48 kHz WAV files with no dependencies.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 48_000;
const DURATION_SECONDS = 5;

function wavFromSine(frequency, amplitude = 0.35) {
  const frames = SAMPLE_RATE * DURATION_SECONDS;
  const data = Buffer.alloc(frames * 2);
  for (let i = 0; i < frames; i++) {
    // 5 ms fade in/out avoids clicks at the loop boundary.
    const fade = Math.min(1, i / 240, (frames - i) / 240);
    const value = amplitude * fade * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE);
    data.writeInt16LE(Math.round(value * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const directory = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(directory, 'a2.wav'), wavFromSine(110));
writeFileSync(join(directory, 'e2.wav'), wavFromSine(82.4069));
writeFileSync(join(directory, 'between-strings-220.wav'), wavFromSine(220));
console.log('Wrote a2.wav (110 Hz), e2.wav (82.4069 Hz), between-strings-220.wav (220 Hz)');
