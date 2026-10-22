# Zemu Guitar Tuner Constitution

## Core Principles

### I. Measurement Accuracy Over Convenience

Pitch detection MUST report error within ±1 cent for the supported range (E2 82.41 Hz
through E4 329.63 Hz) on clean input. Every detection algorithm MUST be validated against
synthetic sine tones and recorded guitar samples with known ground-truth frequencies.
A change that reduces measured accuracy for perceived polish MUST NOT ship.

Rationale: a tuner that is pleasant but wrong damages the user's instrument and trust.

### II. Reference Pitch Is Explicit and Configurable

The app MUST display the active reference pitch at all times, defaulting to A4 = 440 Hz,
and MUST allow adjustment across 415–466 Hz. All cent-offset math MUST derive from the
configured reference; a hard-coded 440 is a defect, not a default.

### III. Audio Stays On-Device

Microphone audio MUST be processed locally and MUST NOT be transmitted, persisted, or
logged. Microphone permission MUST be requested only while the tuner is active, MUST be
revocable at any time, and denial MUST leave the app usable with a clear explanation
rather than a dead end.

### IV. Responsive, Unambiguous Feedback

The tuner MUST show a stable reading within 150 ms of a plucked note and MUST converge
within 1 s. In-tune state MUST be conveyed through redundant channels (visual plus text or
haptic); color alone is insufficient, and cent offset MUST be readable numerically.

### V. Test-First, Measurable Acceptance (NON-NEGOTIABLE)

Every behavior change begins with an automated test or recorded acceptance fixture that
fails first. Pitch-detection tests MUST assert numeric cent error, never "looks correct".
Red–Green–Refactor is mandatory; a task is incomplete until its tests pass in the project's
standard test run.

### VI. Smallest Scope That Tunes a Guitar

Standard tuning (E2 A2 D3 G3 B3 E4) ships first. Alternate tunings, chord detection,
accounts, cloud sync, and social features MUST NOT be added without a ratified spec that
justifies the added complexity. One clear path is preferred over configurable alternatives.

## Technology & Platform Constraints

The stack is fixed: Angular with standalone components and signal-based state, Ionic for
UI components and navigation, Capacitor for the native shell and device APIs.

- TypeScript strict mode MUST be enabled (`strict`, plus `noImplicitOverride` and
  `noUnusedLocals`). New features MUST NOT introduce `NgModule`s; use standalone
  components, directives, and pipes.
- Component state MUST use Angular signals. RxJS is permitted only at asynchronous
  boundaries (audio streams, Capacitor plugin events) and MUST be converted to signals at
  the service edge before reaching templates.
- Audio capture MUST use the Web Audio API, preferring `AudioWorklet` over the deprecated
  `ScriptProcessorNode`. DSP MUST live in framework-free TypeScript modules with zero
  Angular, Ionic, or Capacitor imports so it is unit-testable without a device.
- Microphone permission MUST go through Capacitor's platform permission flow where
  available, with a web fallback; denial handling is governed by Principle III.
- The web/PWA build MUST stay functional offline after first load. Native-only APIs MUST be
  feature-detected, never assumed.
- New runtime dependencies MUST be justified in the plan; closed-source audio SDKs and
  cloud pitch-analysis services are prohibited.

## Development Workflow & Quality Gates

Every feature flows through specify → plan → tasks → implement. Each plan MUST include a
Constitution Check naming every principle above with a pass/fail or justified exception.
Pull requests MUST state which principles are touched and how they are satisfied; reviewers
MUST block on unjustified violations. Detection changes additionally require before/after
accuracy numbers on the shared test fixtures. A feature is done only when its acceptance
scenarios, unit tests, and (where UI behavior changed) end-to-end tests pass.

## Governance

This constitution supersedes other project practices. Amendments require a written
proposal, reviewer approval, and a semantic version bump recorded in the Sync Impact
Report. Versioning: MAJOR for removing or redefining a principle, MINOR for adding a
principle or materially expanding guidance, PATCH for clarifications and wording fixes.
Compliance is reviewed at every plan and pull request; unresolved violations block merge.
The Sync Impact Report is deleted before the amended constitution is committed.

**Version**: 1.0.0 | **Ratified**: 2026-10-22 | **Last Amended**: 2026-10-22
