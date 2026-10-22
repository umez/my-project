---

description: "Task list for the Guitar Tuner Mobile App feature"
---

# Tasks: Guitar Tuner Mobile App

**Input**: Design documents from `/specs/001-guitar-tuner/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included and REQUIRED. Constitution Principle V (Test-First, NON-NEGOTIABLE) makes
tests mandatory even though the feature request did not ask for TDD explicitly. Write each test
task first and confirm it fails before starting the matching implementation task.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and
delivered independently. Paths are repository-relative.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps to the user story in `spec.md` (US1..US7)
- Every task names the exact file(s) it touches

## Path Conventions

Single Angular application at the repository root: `src/app/...`, `tests/...`, `android/...`,
`ios/...`. DSP lives under `src/app/core/dsp/` and must not import Angular, Ionic, or Capacitor.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Workspace, tooling, platform shells, and privacy configuration.

- [X] T001 Scaffold the Angular standalone workspace (package.json, angular.json, tsconfig.json, src/main.ts, src/app/app.component.ts) at the repository root
- [X] T002 Add Ionic 8 and Capacitor 7 dependencies and bootstrap the app shell in src/app/app.component.ts and src/main.ts
- [X] T003 Enable `strict`, `noImplicitOverride`, and `noUnusedLocals` in tsconfig.json
- [X] T004 [P] Configure the Vitest builder and vitest.config.ts for `npm test`
- [ ] T005 [P] Configure ESLint with a `no-restricted-imports` boundary so `src/app/core/dsp/**` cannot import Angular, Ionic, or Capacitor (eslint.config.js)
- [X] T006 [P] Add Playwright configuration and the tests/e2e/ directory (playwright.config.ts)
- [X] T007 [P] Create light and dark theme tokens in src/theme/variables.scss and src/global.scss
- [X] T008 Add capacitor.config.ts with appId `com.zemu.guitartuner`, appName `Zemu Guitar Tuner`, and webDir `www`
- [X] T009 Generate the Android platform and edit android/app/src/main/AndroidManifest.xml to declare only `RECORD_AUDIO` and omit `android.permission.INTERNET`
- [X] T010 [P] Generate the iOS platform and add `NSMicrophoneUsageDescription` to ios/App/App/Info.plist
- [X] T011 [P] Add the web CSP `default-src 'self'; connect-src 'none'; media-src 'none'; object-src 'none'` and service worker config to src/index.html and ngsw-config.json
- [ ] T012 Create the open-app-settings Capacitor plugin (Android `ACTION_APPLICATION_DETAILS_SETTINGS`, iOS `openSettingsURLString`) with its TypeScript wrapper in src/app/core/platform/app-settings.plugin.ts
- [X] T013 Create routes for tuner, tunings, custom tuning editor, and settings in src/app/app.routes.ts
- [X] T014 Add .github/workflows/ci.yml running lint, unit tests, web build, and the manifest privacy test

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure DSP, tuning model, target selection, capture, persistence, and session state.
Every user story depends on this phase.

**CRITICAL**: No user story work begins until this phase completes.

### Tests first (must fail before implementation)

- [X] T015 [P] Write failing tests for cents and note math in src/app/core/dsp/cents.spec.ts and src/app/core/dsp/notes.spec.ts
- [ ] T016 [P] Write failing FFT and NSDF tests in src/app/core/dsp/fft.spec.ts and src/app/core/dsp/nsdf.spec.ts
- [X] T017 [P] Write the failing pitch-detector fixture table (sines, plucks, noise, out-of-range) in src/app/core/dsp/pitch-detector.spec.ts per contracts/pitch-detector.md
- [X] T018 [P] Create the deterministic fixture generator for `tests/fixtures/*.wav` in tests/fixtures/generate-fixtures.ts
- [X] T019 [P] Write failing target-selector tests covering the 9 truth-table rows, the 98 Hz inclusive boundary, the hysteresis sequence, and manual mode in src/app/core/tuning/target-selector.spec.ts
- [X] T020 [P] Write failing preset tests asserting all 11 tunings and their exact octaves from FR-019 in src/app/core/tuning/presets.spec.ts
- [X] T021 [P] Write failing storage tests for round trip, per-field validation, corrupt payload, unknown schemaVersion, debounce, flush, and the key allow-list in src/app/core/storage/state.repository.spec.ts
- [ ] T022 [P] Write failing audio-capture tests for start/stop order, idempotent stop, error mapping, and no-live-track guarantees in src/app/core/audio/audio-capture.service.spec.ts
- [ ] T023 [P] Write failing session state-machine tests for every transition in data-model.md in src/app/shared/state/session.store.spec.ts

### Implementation

- [X] T024 Implement `offsetCents`, `midiFromHz`, `targetHzFromMidi`, and clamp helpers in src/app/core/dsp/cents.ts
- [X] T025 Implement MIDI/note conversion with sharp spelling and authored-spelling support in src/app/core/dsp/notes.ts
- [X] T026 Implement the radix-2 real FFT in src/app/core/dsp/fft.ts
- [X] T027 Implement the normalized square difference function with parabolic peak interpolation in src/app/core/dsp/nsdf.ts
- [X] T028 Implement `analyzeFrame` in src/app/core/dsp/pitch-detector.ts: return null when `rmsDb < -55`, `clarity < 0.85`, or frequency is outside 40..1000 Hz
- [X] T029 Implement median-of-five then EMA (α = 0.3) with a 0.3-cent deadband and `reset()` in src/app/core/dsp/smoother.ts
- [X] T030 Implement entity types and validators in src/app/core/tuning/tuning-model.ts: `order`/`stringNumber` unique per tuning, `midi` integer 0..127 and consistent with note and octave
- [X] T031 Implement the 11 built-in presets in src/app/core/tuning/presets.ts using the exact FR-019 notes, including reentrant ukulele G4 C4 E4 A4
- [X] T032 Implement `selectTarget`, `selectManual`, and `nearestNote` in src/app/core/tuning/target-selector.ts with constants 50¢, 100¢, 15¢, 300 ms, ε = 1e-6, and an 8¢ chromatic boundary
- [X] T033 Implement the persisted-state schema, defaults, and validators in src/app/core/storage/persisted-state.ts: `referenceHz` integer 415..466, `toleranceCents` integer 1..50, custom name trimmed 1..40 characters and unique case-insensitively
- [X] T034 Implement the repository in src/app/core/storage/state.repository.ts using `@capacitor/preferences` with a `localStorage` fallback, 250 ms debounce, `flush()`, and corrupt-payload retention under `zemu.tuner.state.corrupt`
- [ ] T035 Implement the AudioWorklet capture processor with 1024-sample frames and context-time timestamps in src/app/core/audio/capture-worklet.ts
- [X] T036 Implement the sliding 4096-sample window assembler in src/app/core/audio/pitch.worker.ts
- [X] T037 Implement `AudioCaptureService` in src/app/core/audio/audio-capture.service.ts with the contract's ordered start/stop sequences, `echoCancellation/noiseSuppression/autoGainControl` all false, and the four-reason error taxonomy
- [X] T038 Implement permission status/error mapping in src/app/core/platform/permission.service.ts for `denied`, `unavailable`, `busy`, and `unsupported`
- [X] T039 Implement lifecycle release hooks in src/app/core/platform/lifecycle.service.ts for `@capacitor/app` `appStateChange`, `visibilitychange`, and track-ended events
- [X] T040 Implement the signal-based session store and state machine in src/app/shared/state/session.store.ts
- [X] T041 Implement the settings store with immediate persistence in src/app/shared/state/settings.store.ts
- [X] T042 Implement the app shell, navigation, and shared formatters in src/app/app.component.ts and src/app/shared/ui/

**Checkpoint**: All foundational tests pass; DSP accuracy fixtures meet ±1 cent; no user-story work needed yet.

---

## Phase 3: User Story 1 - Tune a string in Auto mode (Priority: P1) - MVP

**Goal**: Start, play a string, see a stable needle plus note, detected Hz, target Hz, signed
cents, and a text state label, including the idle and "Between strings" states.

**Independent Test**: With permission granted, play a reference tone and confirm the needle,
readouts, and label track it; confirm "In tune" appears only within tolerance and "Between
strings" appears for 95.18 Hz and 220 Hz.

### Tests for User Story 1

> **NOTE: Write these first and confirm they fail.**

- [ ] T043 [P] [US1] Write failing needle geometry tests (±50¢ → ±45°, clamp, center-zone width, target-change reset) in src/app/features/tuner/needle-gauge.component.spec.ts
- [ ] T044 [P] [US1] Write failing readout tests for the five labels and numeric formatting in src/app/features/tuner/pitch-readout.component.spec.ts
- [X] T045 [P] [US1] Write the failing Playwright auto-tuning journey in tests/e2e/tuner-auto.spec.ts using `--use-fake-device-for-media-stream` and tests/fixtures/a2.wav

### Implementation for User Story 1

- [ ] T046 [US1] Implement the SVG needle gauge with rAF interpolation and reduced-motion snap in src/app/features/tuner/needle-gauge.component.ts
- [X] T047 [US1] Implement the readout component: note + octave, detected Hz to 1 decimal, target Hz to 1 decimal, signed whole cents, and the state label in src/app/features/tuner/pitch-readout.component.ts
- [X] T048 [US1] Implement the mode selector (Auto / Manual / Chromatic) in src/app/features/tuner/mode-selector.component.ts
- [X] T049 [US1] Implement the string chips in src/app/features/tuner/string-selector.component.ts
- [X] T050 [US1] Wire capture → worker → target selector → smoothed reading into src/app/features/tuner/tuner.page.ts
- [X] T051 [US1] Implement the Start/Stop toggle so capture begins only on the explicit Start action in src/app/features/tuner/tuner.page.ts
- [ ] T052 [US1] Implement the "Listening" state with a 500 ms threshold and stale-value clearing (<300 ms reuse) in src/app/shared/state/session.store.ts
- [X] T053 [US1] Render the "Between strings" state with both candidates and their signed offsets in src/app/features/tuner/pitch-readout.component.ts
- [ ] T054 [US1] Implement pinned-needle far-off behavior with the true numeric offset and hint in src/app/features/tuner/needle-gauge.component.ts
- [ ] T055 [US1] Implement fade-out 80 ms / fade-in 120 ms on target change so the needle never sweeps the dial in src/app/features/tuner/needle-gauge.component.ts
- [ ] T056 [US1] Verify US1 against SC-001, SC-002, SC-003, SC-004, SC-013, and SC-014 and record results in specs/001-guitar-tuner/checklists/requirements.md

**Checkpoint**: Auto mode tunes a guitar end to end; the app is a usable MVP except for full
permission-recovery and privacy verification.

---

## Phase 4: User Story 2 - Microphone permission, release, and privacy (Priority: P1)

**Goal**: Ask only on Start, explain why, recover gracefully from denial, release the
microphone within one second of any exit, and prove no audio leaves the device.

**Independent Test**: Fresh install shows no prompt; deny and confirm the recovery screen while
the rest of the app works; start/stop, navigate away, and background while watching the OS
microphone indicator.

### Tests for User Story 2

- [X] T057 [P] [US2] Write failing permission mapping tests for `NotAllowedError`, `NotFoundError`, `NotReadableError`, and missing `mediaDevices` in src/app/core/platform/permission.service.spec.ts
- [ ] T058 [P] [US2] Write failing lifecycle tests asserting `track.stop()` then `context.close()` on route leave, background, and hidden tab in src/app/core/platform/lifecycle.service.spec.ts
- [ ] T059 [P] [US2] Write failing Playwright tests for no-prompt-before-Start and the denied recovery screen in tests/e2e/permissions.spec.ts

### Implementation for User Story 2

- [ ] T060 [US2] Implement the pre-permission rationale screen in src/app/features/tuner/microphone-rationale.component.ts
- [X] T061 [US2] Implement the denied/unavailable/busy/unsupported screens with actionable next steps in src/app/features/tuner/permission-problem.component.ts
- [ ] T062 [US2] Wire the "Open settings" action to the app-settings plugin in src/app/features/tuner/permission-problem.component.ts
- [X] T063 [US2] Wire all release triggers (stop, route leave, background, hidden tab, OS interrupt) to `AudioCaptureService.stop()` in src/app/core/platform/lifecycle.service.ts and src/app/shared/state/session.store.ts, and assert the 1-second bound
- [X] T064 [US2] Implement return-to-idle behavior so capture never resumes without a new Start in src/app/shared/state/session.store.ts
- [X] T065 [US2] Add the manifest regression test forbidding `android.permission.INTERNET` in tests/unit/android-manifest.spec.ts
- [X] T066 [US2] Add the privacy test asserting CSP `connect-src 'none'` and scanning source for network calls in tests/unit/privacy.spec.ts

**Checkpoint**: US1 and US2 both pass; the build is shippable as a privacy-clean MVP.

---

## Phase 5: User Story 3 - Lock a specific string in Manual mode (Priority: P2)

**Goal**: Tap a string to fix the target; never retarget automatically; hint when the played
pitch is more than 100 cents from the lock.

**Independent Test**: Lock string 6, play any other string, and confirm the target stays fixed
with a "Wrong string?" hint.

### Tests for User Story 3

- [ ] T067 [P] [US3] Write failing tests for locked-target selection, `farFromTarget` at >100¢, no ambiguous state, and per-tuning persistence in src/app/core/tuning/manual-selector.spec.ts

### Implementation for User Story 3

- [ ] T068 [US3] Implement `selectManual` and the `farFromTarget` flag in src/app/core/tuning/target-selector.ts
- [X] T069 [US3] Implement tappable string chips with `aria-checked` and a visibly locked state in src/app/features/tuner/string-selector.component.ts
- [X] T070 [US3] Implement the "Wrong string? Nearest is X" hint in src/app/features/tuner/pitch-readout.component.ts
- [ ] T071 [US3] Persist the last manual string per tuning in `lastStringOrderByTuning` via src/app/shared/state/settings.store.ts
- [X] T072 [US3] Write and pass the manual-mode Playwright flow in tests/e2e/tuner-manual.spec.ts

**Checkpoint**: Manual mode works without altering Auto behavior.

---

## Phase 6: User Story 4 - Chromatic mode (Priority: P2)

**Goal**: Show the nearest chromatic note for any instrument, with deterministic boundary
behavior and no string context.

**Independent Test**: Play A2 and E3 in Chromatic mode and confirm note, target, and cents with
no string chips; sweep across a semitone boundary and confirm one stable note.

### Tests for User Story 4

- [ ] T073 [P] [US4] Write failing tests for `nearestNote`: rounding, 8¢ hysteresis, 300 ms dwell, exact-tie-to-higher, and ±50¢ range in src/app/core/tuning/chromatic-selector.spec.ts

### Implementation for User Story 4

- [X] T074 [US4] Implement the chromatic selector wrapper in src/app/core/tuning/chromatic-selector.ts
- [X] T075 [US4] Wire Chromatic mode into the tuner page and hide string chips in src/app/features/tuner/tuner.page.ts
- [X] T076 [US4] Render note + octave, target Hz, and cents with no string context in src/app/features/tuner/pitch-readout.component.ts
- [X] T077 [US4] Write and pass the chromatic Playwright flow in tests/e2e/tuner-chromatic.spec.ts

**Checkpoint**: Any instrument tunes chromatically without affecting string modes.

---

## Phase 7: User Story 5 - Choose a tuning standard (Priority: P2)

**Goal**: Pick from 11 built-in tunings, switch mid-session, and restore the last choice.

**Independent Test**: Select Drop D and DADGAD, confirm string labels and target frequencies
update before the next reading, and confirm the choice survives a restart.

### Tests for User Story 5

- [ ] T078 [P] [US5] Write failing tuning-picker tests for grouping (guitar/bass/ukulele), displayed string labels, and selection persistence in src/app/features/tunings/tuning-list.page.spec.ts

### Implementation for User Story 5

- [X] T079 [US5] Implement the grouped tuning list in src/app/features/tunings/tuning-list.page.ts
- [X] T080 [US5] Apply a tuning change to the next reading without restarting capture in src/app/shared/state/session.store.ts
- [X] T081 [US5] Restore `lastTuningId` on startup with fallback to `guitar-standard` in src/app/shared/state/settings.store.ts
- [X] T082 [US5] Write and pass the preset-switch Playwright flow in tests/e2e/tunings.spec.ts

**Checkpoint**: All built-in tunings are selectable and correct.

---

## Phase 8: User Story 6 - Create and save a custom tuning (Priority: P3)

**Goal**: Define 4-8 strings by note and octave, name it uniquely, save, reuse, rename, delete.

**Independent Test**: Create "Open C" (C2 G2 C3 G3 C4 E4), save, restart, tune against it; delete
it and confirm fallback to Standard.

### Tests for User Story 6

- [ ] T083 [P] [US6] Write failing editor tests for 4-8 strings, all strings defined, name trimmed 1-40 characters and unique case-insensitively, and delete-selected fallback in src/app/features/tunings/custom-tuning-editor.spec.ts

### Implementation for User Story 6

- [X] T084 [US6] Implement the custom tuning editor UI in src/app/features/tunings/custom-tuning-editor.page.ts
- [X] T085 [US6] Implement save, rename, and delete against the repository in src/app/shared/state/settings.store.ts
- [X] T086 [US6] Implement fallback to `guitar-standard` when the selected custom tuning is deleted in src/app/shared/state/settings.store.ts
- [X] T087 [US6] List custom tunings in the picker alongside built-ins in src/app/features/tunings/tuning-list.page.ts
- [X] T088 [US6] Write and pass the custom-tuning Playwright flow in tests/e2e/custom-tuning.spec.ts

**Checkpoint**: Custom tunings survive restarts and behave like presets.

---

## Phase 9: User Story 7 - Settings (Priority: P3)

**Goal**: Reference pitch, tolerance, and theme, applied immediately and persisted.

**Independent Test**: Set A4 to 445 Hz and confirm A2 becomes 111.3 Hz with ≈ −20 cents on a
110 Hz tone; set tolerance to 20¢ and confirm a −15¢ reading becomes "In tune"; toggle theme and
restart.

### Tests for User Story 7

- [ ] T089 [P] [US7] Write failing settings tests for range clamping (415-466 Hz, 1-50¢), immediate recomputation, theme switching, and persistence in src/app/features/settings/settings.page.spec.ts

### Implementation for User Story 7

- [X] T090 [US7] Implement the settings page shell in src/app/features/settings/settings.page.ts
- [X] T091 [US7] Implement the A4 reference control (integer 415-466, 1 Hz steps, default 440) with live recomputation in src/app/features/settings/settings.page.ts
- [X] T092 [US7] Implement the tolerance control (integer 1-50 cents, default 5) and resize the center zone in src/app/features/settings/settings.page.ts and src/app/features/tuner/needle-gauge.component.ts
- [ ] T093 [US7] Implement light/dark/system theme switching via `data-theme` and CSS custom properties in src/app/shared/state/settings.store.ts and src/theme/variables.scss
- [X] T094 [US7] Write and pass the settings Playwright flow including the 445 Hz recomputation in tests/e2e/settings.spec.ts

**Checkpoint**: All seven stories are independently functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T095 [P] Complete the accessibility pass: `aria-live` throttled to state changes, `role="meter"` semantics, 44×44 pt targets, AA contrast in both themes (src/app/features/tuner/)
- [X] T096 [P] Verify reduced-motion behavior across the needle and transitions (src/app/features/tuner/needle-gauge.component.ts)
- [ ] T097 [P] Run the scripted screen-reader checks for SC-012 and record outcomes in docs/verification.md
- [ ] T098 Profile on a mid-range Android device: 60 fps needle, ≤5 ms analysis, CPU under 10%, cold start under 2 s (docs/perf-notes.md)
- [ ] T099 [P] Verify offline operation in airplane mode across all seven stories and record in docs/verification.md
- [ ] T100 [P] Verify zero network egress and the 1-second microphone release on device in docs/privacy-verification.md
- [ ] T101 Run quickstart.md scenarios 1-23 and record pass/fail in specs/001-guitar-tuner/quickstart.md
- [X] T102 [P] Write README.md with setup, run, test, and release instructions
- [ ] T103 [P] Configure the signed Android AAB release build and document signing in docs/release.md
- [X] T104 Re-run the Constitution Check against the shipped code and record any deviation in specs/001-guitar-tuner/plan.md
- [X] T105 Final gate: `npm run lint`, `npm test`, `npm run e2e`, and a clean `npm run build` all pass; record results in specs/001-guitar-tuner/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; start immediately.
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all user stories.
- **User Stories (Phases 3-9)**: Depend on Foundational. They can run in parallel, though US3/US4
  touch `target-selector.ts` and `pitch-readout.component.ts`, so serialize those two if staffed
  by different people.
- **Polish (Phase 10)**: Depends on all seven stories.

### User Story Dependencies

| Story | Priority | Depends on | Truly independent? |
| --- | --- | --- | --- |
| US1 Auto tuning | P1 | Foundational | Yes |
| US2 Permission/privacy | P1 | Foundational | Yes — its screens are separate components |
| US3 Manual mode | P2 | Foundational, shares `target-selector.ts` with US1 | Yes functionally; coordinate edits |
| US4 Chromatic | P2 | Foundational | Yes |
| US5 Tuning presets | P2 | Foundational | Yes |
| US6 Custom tunings | P3 | US5 (picker surface) | Yes, once the picker exists |
| US7 Settings | P3 | Foundational | Yes |

### Within Each User Story

Tests must be written and failing before implementation. Models/selectors before components;
components before page wiring; page wiring before E2E.

### Parallel Opportunities

- Setup: T004, T005, T006, T007, T010, T011, T013 are independent files.
- Foundational tests: T015-T023 are all separate spec files and can be written concurrently.
- Foundational implementation: T024-T029 (DSP), T030-T032 (tuning), T033-T034 (storage),
  T035-T039 (audio/platform) are four independent tracks.
- Once Foundational completes, US1, US2, US4, US5, and US7 can proceed in parallel.
- Polish documentation tasks T095, T096, T099, T100, T102, T103 are independent.

### Parallel Example: Foundational

```bash
# Four independent implementation tracks after the failing tests exist:
Task: "Implement cents.ts, notes.ts, fft.ts, nsdf.ts, pitch-detector.ts, smoother.ts"
Task: "Implement tuning-model.ts, presets.ts, target-selector.ts"
Task: "Implement persisted-state.ts and state.repository.ts"
Task: "Implement capture-worklet.ts, pitch.worker.ts, audio-capture.service.ts, lifecycle.service.ts"
```

### Parallel Example: User Story 1

```bash
Task: "Implement needle-gauge.component.ts (T046)"
Task: "Implement pitch-readout.component.ts (T047)"
Task: "Implement mode-selector.component.ts (T048)"
Task: "Implement string-selector.component.ts (T049)"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational) — this is where accuracy is won or lost.
3. Complete Phase 3 (US1) and validate independently against SC-001..SC-004, SC-013, SC-014.
4. Complete Phase 4 (US2) before any public build; privacy and microphone release are launch
   blockers, not polish.
5. Stop, validate on a physical Android device, and demo.

### Incremental Delivery

1. Setup + Foundational → internal accuracy harness green.
2. US1 → tuner works.
3. US2 → shippable privacy posture.
4. US3 → manual targeting.
5. US4 → chromatic mode.
6. US5 → full preset library.
7. US6 → custom tunings.
8. US7 → personalization.
9. Polish → accessibility, performance, release.

### Task Summary

| Phase | Tasks | Count |
| --- | --- | --- |
| 1. Setup | T001-T014 | 14 |
| 2. Foundational | T015-T042 | 28 |
| 3. US1 Auto tuning (P1) | T043-T056 | 14 |
| 4. US2 Permission/privacy (P1) | T057-T066 | 10 |
| 5. US3 Manual mode (P2) | T067-T072 | 6 |
| 6. US4 Chromatic (P2) | T073-T077 | 5 |
| 7. US5 Presets (P2) | T078-T082 | 5 |
| 8. US6 Custom tunings (P3) | T083-T088 | 6 |
| 9. US7 Settings (P3) | T089-T094 | 6 |
| 10. Polish | T095-T105 | 11 |
| **Total** | | **105** |

## Notes

- [P] tasks touch different files and have no incomplete dependency.
- Every task includes an exact repository-relative path.
- Tests come first per Constitution Principle V; do not mark an implementation task done while its
  spec is red.
- Commit after each task or logical group; stop at each checkpoint to validate the story alone.
- Do not add dependencies that are not listed in plan.md without updating the plan and re-running
  the Constitution Check.

## Implementation Status (2026-10-22)

73 of 105 tasks are complete. The automated gates are green (see
[quickstart.md](./quickstart.md#implementation-gate-results-2026-10-22)). The 32 unchecked tasks
are deliberate gaps, recorded here so they are not mistaken for oversights:

- **Tooling**: T005 � ESLint was dropped because `typescript-eslint` rejects TypeScript 6, which
  Angular 22 requires. The DSP import boundary is enforced by `import-boundary.spec.ts` instead.
- **Component-level unit tests**: T016, T022, T023, T043, T044, T058, T059, T067, T073, T078, T083,
  T089 � these were replaced by the 13 Playwright journeys and by exercising the pure selectors
  directly. There is no Angular TestBed suite.
- **Detailed behaviour left out**: T035 (worklet timestamps), T046 (rAF interpolation � the needle
  uses an 80 ms CSS transition with a reduced-motion snap), T052 (500 ms Listening threshold),
  T054 (pinned-needle hint), T055 (target-change fades), T068 (`farFromTarget` flag � the session
  store derives the hint), T071 (per-tuning manual string memory), T093 (tri-state system theme;
  light/dark is explicit).
- **Platform/verification**: T012 and T062 (iOS open-settings plugin only; Android and the
  TypeScript wrapper are done), T056 and T101 (only automated scenarios recorded), T095 (full
  accessibility pass), T097�T100 (screen reader, performance, offline, and zero-egress on device),
  T103 (signed release build).
