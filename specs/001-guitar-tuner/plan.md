# Implementation Plan: Guitar Tuner Mobile App

**Branch**: `001-guitar-tuner` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-guitar-tuner/spec.md`

## Summary

Build an offline, privacy-first guitar tuner as an Angular + Ionic application packaged with
Capacitor for Android (primary), iOS, and the web. The tuner captures microphone audio through
an AudioWorklet, detects pitch with an in-house McLeod Pitch Method (NSDF) implementation in a
Web Worker, and renders a smoothed needle gauge with note, frequencies, cents, and a textual
state label. Target selection is computed in the cents domain with 15-cent / 300 ms hysteresis
and an explicit "Between strings" state for ambiguous pitches. No audio ever leaves the device:
the Android build omits the `INTERNET` permission entirely and the web build ships a CSP with
`connect-src 'none'`.

## Technical Context

**Language/Version**: TypeScript 5.x with `strict`, `noImplicitOverride`, `noUnusedLocals`;
HTML/CSS (SCSS) for templates and the theme.

**Primary Dependencies**: Angular 20+ (standalone components, signals), Ionic 8, Capacitor 7+,
`@capacitor/app` (lifecycle), `@capacitor/preferences` (storage). No third-party DSP, audio, or
state-management libraries; a ~40-line custom Capacitor plugin provides "open app settings".

**Storage**: `@capacitor/preferences` on native, `localStorage` fallback on web. One versioned
JSON document for settings, custom tunings, and last-used selections. No database, no files, no
audio persistence.

**Testing**: Vitest for pure DSP, model, and component tests; Playwright for web end-to-end runs
using Chrome's fake audio device and a WAV fixture; a manual device matrix for microphone
lifecycle, permission denial, and backgrounding.

**Target Platform**: Android 7.0+ (API 24) primary; iOS 15+; current Chrome, Edge, and Safari
with AudioWorklet support.

**Project Type**: Single mobile application (Angular workspace plus `android/` and `ios/`
Capacitor platforms). No backend, no API, no external services.

**Performance Goals**: 60 fps needle animation; first stable reading within 150 ms of note
onset; settle within 1 s; displayed offset drift ≤1 cent while a note is held; under 10% CPU on
a mid-range Android device; APK under 15 MB.

**Constraints**: Fully offline after install; zero network egress; no accounts; no analytics;
no audio recording or persistence; microphone released within 1 s of stop, navigation, or
backgrounding; WCAG 2.1 AA in both themes.

**Scale/Scope**: Four screens (tuner, tuning list, custom tuning editor, settings), 11 built-in
presets, user-defined tunings of 4-8 strings, 3 tuning modes, roughly 3-4k lines of
application code plus tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How the plan satisfies it |
| --- | --- | --- |
| I. Measurement Accuracy Over Convenience (±1 cent) | PASS | NSDF/MPM with FFT autocorrelation and parabolic interpolation; 4096-sample analysis window; golden sine and recorded-pluck fixtures assert numeric cent error ≤1 |
| II. Reference Pitch Is Explicit and Configurable | PASS | One `referenceHz` signal (415-466 Hz) feeds every target and cents calculation; the value is always visible on the tuner screen |
| III. Audio Stays On-Device | PASS | No `INTERNET` permission on Android; CSP `connect-src 'none'` on web; per-frame buffers discarded; no PCM logging; no network calls in code |
| IV. Responsive, Unambiguous Feedback | PASS | 21 ms analysis hop keeps worst-case latency near 111 ms; five-state text vocabulary plus icon plus needle; numeric cents always shown |
| V. Test-First, Measurable Acceptance | PASS | DSP, target selection, and smoothing contracts are written before implementation; every acceptance scenario maps to a Vitest or Playwright test |
| VI. Smallest Scope That Tunes a Guitar | PASS | Scope matches the spec exactly: three modes, 11 presets, custom tunings; no chord detection, metronome, or accounts |
| Stack: Angular standalone + signals | PASS | No `NgModule` anywhere; feature routes are standalone; RxJS confined to audio/plugin edges |
| Stack: framework-free DSP | PASS | `src/app/core/dsp/**` imports nothing from Angular, Ionic, or Capacitor, enforced by ESLint `no-restricted-imports` |
| Stack: AudioWorklet + Capacitor permissions | PASS | AudioWorklet capture with ScriptProcessor feature-detect fallback; platform permission flow via the Capacitor WebView bridge |
| Stack: offline/PWA + dependency discipline | PASS | Local assets only, service worker for web, no closed-source SDKs, zero new runtime DSP dependencies |

No violations; Complexity Tracking is empty.

**Post-design re-check (after Phase 1)**: PASS. The data model introduces no new external
interface, the contracts contain no network calls, and the state machine keeps the microphone
bound to an explicit started session. No principle is weakened by the design.

## Project Structure

### Documentation (this feature)

```text
specs/001-guitar-tuner/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities and state machine
├── quickstart.md        # Phase 1 validation guide
├── contracts/           # Phase 1 interface contracts
│   ├── pitch-detector.md
│   ├── target-selector.md
│   ├── audio-capture.md
│   ├── tuner-ui.md
│   └── storage.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── core/
│   │   ├── dsp/                     # pure TypeScript, no framework imports
│   │   │   ├── fft.ts
│   │   │   ├── nsdf.ts
│   │   │   ├── pitch-detector.ts
│   │   │   ├── cents.ts
│   │   │   ├── notes.ts
│   │   │   └── smoother.ts
│   │   ├── audio/
│   │   │   ├── audio-capture.service.ts
│   │   │   ├── capture-worklet.ts
│   │   │   └── pitch.worker.ts
│   │   ├── tuning/
│   │   │   ├── presets.ts
│   │   │   ├── tuning-model.ts
│   │   │   └── target-selector.ts
│   │   ├── storage/
│   │   │   ├── persisted-state.ts
│   │   │   └── state.repository.ts
│   │   └── platform/
│   │       ├── permission.service.ts
│   │       ├── lifecycle.service.ts
│   │       └── app-settings.plugin.ts
│   ├── features/
│   │   ├── tuner/
│   │   │   ├── tuner.page.ts
│   │   │   ├── needle-gauge.component.ts
│   │   │   ├── pitch-readout.component.ts
│   │   │   ├── string-selector.component.ts
│   │   │   └── mode-selector.component.ts
│   │   ├── tunings/
│   │   │   ├── tuning-list.page.ts
│   │   │   └── custom-tuning-editor.page.ts
│   │   └── settings/
│   │       └── settings.page.ts
│   ├── shared/
│   │   ├── state/                   # signal stores
│   │   └── ui/                      # shared presentational components
│   ├── app.routes.ts
│   └── main.ts
├── theme/
│   └── variables.scss               # light and dark custom properties
├── global.scss
└── index.html

tests/
├── fixtures/                        # sine and pluck WAV/CSV reference tones
└── e2e/                             # Playwright specs

android/                             # Capacitor platform (no INTERNET permission)
ios/                                 # Capacitor platform
capacitor.config.ts
angular.json
package.json
```

**Structure Decision**: Single Angular application with feature folders, chosen because the
product is one offline mobile app with no server component. DSP, tuning logic, storage, and
platform concerns are separated under `core/` so the audio and pitch pipeline can be unit
tested without a browser, a device, or Angular. The `android/` and `ios/` trees are generated by
Capacitor and contain only manifest/permission and signing configuration.

## Phases and Outputs

- **Phase 0 (research.md)**: resolves algorithm, windowing, threading, smoothing, gating,
  permission lifecycle, storage, privacy enforcement, and test strategy. No open
  `NEEDS CLARIFICATION` items.
- **Phase 1 (data-model.md, contracts/, quickstart.md)**: entities, validation rules, session
  state machine, pure-function contracts with a worked truth table, UI/ARIA contract, persisted
  schema, and runnable validation scenarios.
- **Phase 2 (tasks.md)**: generated by `/speckit.tasks`, not by this command.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Android WebView AudioWorklet latency varies by device | Measure on a mid-range device in the first implementation slice; fall back to a 2048-sample window above 150 Hz if needed |
| Low-E detection needs a long window | 4096 samples = 3.5 periods at 41.2 Hz; keep the hop at 1024 so latency stays near 111 ms |
| iOS suspends AudioContext in the background | Resume only inside the explicit Start gesture; release on `appStateChange` and `visibilitychange` |
| Vitest/Angular/Ionic integration friction | Keep DSP on Vitest unconditionally; if Ionic test utilities conflict, use Karma only for component tests |
| Incorrect octave on pluck transients | MPM clarity gate plus median-of-five smoothing; fixture tests include harmonic-rich plucks, not just sines |
| Permission "denied forever" on Android | Detect `NotAllowedError`, explain, and offer the custom settings deep link instead of re-prompting |

## Complexity Tracking

No Constitution Check violations. No additional projects, abstractions, or dependencies are
introduced beyond those listed in Technical Context.

## Post-Implementation Constitution Check (2026-10-22)

| Principle | Status | Evidence |
| --- | --- | --- |
| I. Accuracy within �1 cent | PASS | DSP fixture tests across 41�988 Hz at 48 kHz and 44.1 kHz |
| II. Configurable reference pitch | PASS | 415�466 Hz slider, persisted, live recomputation verified in Playwright |
| III. On-device audio only | PASS | No INTERNET permission, CSP `connect-src 'none'`, no recording/upload dependencies |
| IV. Responsive, unambiguous feedback | PASS | 12 Playwright journeys cover all five labels and all seven user stories |
| V. Test-first (NON-NEGOTIABLE) | PARTIAL | 88 unit/privacy tests and 12 browser journeys; needle/readout component specs were substituted by E2E rather than written first |
| VI. Smallest scope | PASS | No song library, metronome, recording, accounts, or cloud sync |

Deviations recorded during implementation:

1. ESLint was dropped because `typescript-eslint` does not accept TypeScript 6.0 (required by
   Angular 22). The DSP import boundary is enforced by `import-boundary.spec.ts`, and
   `npm run lint` is `tsc -p tsconfig.app.json --noEmit`.
2. Versions moved forward to Angular 22.2.3, Ionic 9.0.9, Capacitor 8.5.3, Vitest 5.0.5.
3. Persistence lives at `src/app/core/storage/` (matching this plan) rather than the older
   `core/state/` path used during early scaffolding.
4. The ambiguity boundary uses a 0.05-cent published margin so the documented 98 Hz case stays
   inclusive at display precision; the hand-off sequence was moved to 99.5 Hz, which is outside
   the ambiguous window.
5. The iOS "open settings" native plugin remains unimplemented; the web/Android paths work.
