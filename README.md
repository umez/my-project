# Zemu Guitar Tuner

An offline, privacy-first guitar tuner for Android, iOS, and the web.

Zemu listens only while you are tuning, analyses pitch on the device, and has no
account, analytics, cloud sync, or network permission. It shows a smooth analog
needle, the detected note and frequency, the target frequency, the signed cent
offset, and a plain-language state: **Flat**, **Sharp**, **In tune**, **Between
strings**, or **Listening**.

## Features

- **Auto** — locks onto the nearest string, with a 15 ¢ / 300 ms hand-off rule so
  the needle does not jump between strings.
- **Manual** — tap a string chip to lock the target; a hint appears when the
  played pitch is more than 100 ¢ away.
- **Chromatic** — nearest equal-tempered note for any instrument.
- **11 built-in tunings** — Standard, Drop D, Double Drop D, Open G, Open D,
  Open E, DADGAD, half-step down, full-step down, 4-string bass (E A D G), and
  reentrant ukulele (G C E A).
- **Custom tunings** — 4–8 strings by note and octave, saved locally.
- **Settings** — A4 reference 415–466 Hz (default 440), in-tune tolerance 1–50 ¢
  (default 5), and light/dark themes. Everything persists across restarts.
- **Between strings** — when the nearest string is more than 50 ¢ away and the
  runner-up is within 100 ¢ of the same distance, the needle centers and dims,
  and both candidates are listed with signed offsets. 220 Hz in Standard tuning
  is the canonical example.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Angular 22, standalone components, signals, zoneless |
| UI | Ionic 9 |
| Native shell | Capacitor 8 (Android, iOS) |
| Pitch detection | In-house MPM/NSDF, 4096-sample window, 1024-sample hop |
| Tests | Vitest 5 and Playwright 1.64 |
| Language | TypeScript 6 |

## Quick start

```bash
npm ci
npm start          # http://localhost:4200
npm run build      # production bundle in www/
npm test           # 88 unit, DSP, storage, and privacy tests
npm run e2e        # 12 Playwright journeys (fake microphone)
npm run lint       # tsc --noEmit (strict)
```

The first Start tap shows a rationale panel; the OS microphone prompt only
appears after **Allow microphone**. Capture is released on Stop, route leave, tab
hide, and app background.

## Architecture

```text
src/app/
  core/
    dsp/        pure TypeScript: FFT, NSDF, pitch detector, cents, notes, smoother
    tuning/     presets, tuning model, target selector, chromatic selector
    storage/    persisted schema, repository, custom-tuning conversion
    audio/      AudioWorklet source, pitch worker, capture service
    platform/   permission mapping, lifecycle hooks, settings plugin wrapper
  shared/state/ settings store, session state machine and reading pipeline
  features/     tuner, tuning list, custom tuning editor, settings
android/        Capacitor Android project (RECORD_AUDIO only)
ios/            Capacitor iOS project (NSMicrophoneUsageDescription)
tests/          WAV fixtures, generators, Playwright journeys, privacy checks
```

**Signal flow:** `getUserMedia` → AudioWorklet (1024 samples) → Web Worker
(4096-sample sliding window) → `analyzeFrame` → target selection → median-5 +
EMA smoothing → Angular signals → needle and readout.

The DSP, tuning, and storage layers are framework-free. A unit test reads the
source tree and fails if `core/dsp` or `core/tuning` imports Angular, Ionic, or
Capacitor. `npm run lint` is `tsc --noEmit` plus that boundary test; ESLint was
dropped because its TypeScript peer range lagged TypeScript 6.

## Privacy

- `android/app/src/main/AndroidManifest.xml` declares only microphone-related permissions
  (`RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`); no network permission is present.
- iOS declares `NSMicrophoneUsageDescription` and no arbitrary-loads exception.
- The web CSP uses `connect-src 'none'`, `media-src 'none'`, and
  `object-src 'none'`. AudioWorklet code is loaded from a local Blob.
- Audio is never recorded, written to storage, or uploaded. Only settings and
  custom tunings are persisted, under `zemu.tuner.state`.
- Automated privacy tests assert the manifest, plist, CSP, and absence of
  analytics/upload dependencies (`tests/unit/privacy.spec.ts`).

## Native builds

```bash
npm run build
npx cap sync
npx cap open android   # Android Studio
npx cap open ios       # Xcode (macOS)
```

Android notes:

- `MainActivity` registers the local `AppSettingsPlugin`, used by the denied
  permission screen to open system settings.
- The WebView microphone path needs a physical device or an emulator with a
  virtual microphone for final verification.

iOS notes:

- `Info.plist` includes the microphone purpose string.
- The TypeScript `AppSettings` wrapper falls back to inline instructions on iOS
  until a Swift implementation is added.

## Testing

Unit tests cover:

- Frequency/MIDI/cent math, including the +152.5 ¢ / −156 ¢ sign convention.
- Pitch accuracy within ±1 ¢ for every guitar string, 41–988 Hz, at 48 kHz and
  44.1 kHz; octave safety with a dominant second harmonic; null results for
  silence, quiet input, and noise.
- The full target-selection truth table, the 98 Hz inclusive ambiguity boundary,
  the 15 ¢ / 300 ms hand-off, thickest-string tie-break, and manual lock.
- Chromatic rounding, exact-tie-to-higher, 8 ¢ hysteresis, octave jumps.
- All 11 presets with exact octaves, including reentrant ukulele.
- Storage round-trip, debounce, flush, corrupt-payload retention, clamping, and
  schema normalization.

Playwright journeys cover all seven user stories with a deterministic fake
microphone: A2 in tune, 220 Hz "Between strings", manual lock with a nearest
string hint, chromatic mode, tuning persistence, custom tuning create/persist/
delete, and reference-pitch recomputation.

```bash
npm test
npm run e2e
```

## Known limitations

- SC-006 (first success within 60 s) and SC-010 (custom tuning within 90 s)
  require moderated usability sessions and have not been measured.
- Component-level specs for the needle and readout were replaced by browser
  journeys; there is no Angular TestBed unit suite.
- The iOS "open settings" native plugin is not implemented.
- Theme selection is explicit light/dark; a tri-state system option is not
  exposed.
- Launcher and store icons are placeholders.
- Release signing and store submission are not configured.

## Specification

The full feature specification, plan, contracts, data model, research notes, and
task list live in [`specs/001-guitar-tuner/`](specs/001-guitar-tuner/). Governance
is in [`.specify/memory/constitution.md`](.specify/memory/constitution.md).
