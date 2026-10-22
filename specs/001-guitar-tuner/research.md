# Phase 0 Research: Guitar Tuner Mobile App

All Technical Context unknowns are resolved below. No item remains marked
`NEEDS CLARIFICATION`.

## R1. Pitch detection algorithm

**Decision**: Implement the McLeod Pitch Method (normalized square difference function, NSDF)
with FFT-based autocorrelation and parabolic peak interpolation. Clarity threshold 0.85.

**Rationale**: MPM returns a clarity/confidence value alongside the pitch, which the idle and
noise gating requirements need. It is substantially more resistant to octave errors than plain
autocorrelation on plucked strings, where the second harmonic can exceed the fundamental.
Parabolic interpolation on the NSDF peak yields sub-sample lag precision well inside the ±1
cent target. The whole implementation is roughly 200 lines of pure TypeScript, so it needs no
runtime dependency and can be unit tested in Node.

**Alternatives considered**:

- *YIN*: accurate and simpler, but its cumulative mean normalization removes the direct
  confidence signal, and it slips octaves more often on decaying plucks.
- *FFT + harmonic product spectrum*: fast, but frequency resolution at 41 Hz with a 4096-point
  FFT is about 12 Hz per bin before interpolation, which is far too coarse for ±1 cent at the
  low end.
- *CREPE / neural pitch tracking*: excellent accuracy but adds a multi-megabyte model, violates
  the smallest-scope principle, and complicates offline packaging.
- *Third-party library (`pitchy`, etc.)*: viable, but the constitution requires justifying each
  dependency; a self-contained NSDF keeps the audio path auditable and dependency-free.

## R2. Analysis window, hop, and sample rate

**Decision**: Request 48 kHz capture. Analyze 4096-sample frames (85.3 ms) every 1024 samples
(21.3 ms), giving about 47 readings per second. Fall back to the device default sample rate and
scale the frame length to keep the same time window.

**Rationale**: The lowest supported note is bass E1 at 41.2 Hz, whose period is 24.3 ms. A
4096-sample window contains 3.5 periods, the practical minimum for a stable NSDF peak. The
1024-sample hop keeps the worst-case latency at roughly 85 ms of window fill + 21 ms of hop +
under 5 ms of processing ≈ 111 ms, inside the 150 ms requirement. At 44.1 kHz the same frame
count is 92.9 ms, still acceptable.

**Alternatives considered**: 2048 samples (42.7 ms) fails the 3-period rule at E1 and produces
octave errors; 8192 samples improves low-end confidence but pushes latency past 150 ms; a
frequency-adaptive window adds complexity without a measurable benefit for the supported range.

## R3. Threading model

**Decision**: AudioWorklet captures and forwards `Float32Array` frames over `postMessage`; a
dedicated Web Worker runs the NSDF and smoothing pipeline; the main thread only renders.

**Rationale**: A naive O(N²) NSDF over 4096 samples is about 16 million operations per frame.
At 47 frames per second on a mid-range phone that risks blocking the UI thread and dropping
needle frames. Running the FFT-based variant in a Worker keeps the main thread free for 60 fps
animation and touch input.

**Alternatives considered**: DSP on the main thread (jank risk); DSP inside the AudioWorklet
(worklets are designed for real-time audio, and a long analysis loop can cause dropouts);
SharedArrayBuffer (requires cross-origin isolation headers that complicate Capacitor and are
unnecessary at this data rate).

## R4. Signal quality gating and idle detection

**Decision**: A frame is usable only when RMS is above −55 dBFS **and** clarity is at least
0.85. Three consecutive unusable frames (about 64 ms) switch the UI to "Listening"; three
consecutive usable frames switch it back to "reading". The last valid reading is retained for
at most 300 ms with a visibly stale treatment before being cleared.

**Rationale**: RMS alone rejects silence but not noise; clarity alone rejects noise but not a
quiet room's DC offset. Together they cover both failure modes. Three-frame hysteresis prevents
flicker at the threshold and stays inside the 500 ms idle requirement.

**Alternatives considered**: single-frame gating (flickers); spectral flatness (more expensive
and redundant once clarity is available); a fixed dB threshold per device (unmaintainable).

## R5. Smoothing and needle stability

**Decision**: Convert every frame's offset to cents, apply a five-frame median filter, then an
exponential moving average with α = 0.3 and a 0.3-cent deadband. Reset both filters whenever
the selected target changes.

**Rationale**: The median removes single-frame octave or noise spikes that an average would
merely smear. Smoothing in the cents domain (not hertz) keeps the response uniform across the
range. Resetting on target change prevents a filter from interpolating between two different
strings, which would display a physically impossible intermediate reading.

**Alternatives considered**: Kalman filtering (better model, but the process noise is unknown
and tuning it is guesswork); one-pole low-pass only (jitter and spikes pass through); no
deadband (the last digit never settles, failing the ≤1 cent drift criterion).

## R6. Cents and note mathematics

**Decision**: Compute everything from MIDI numbers relative to the configured reference:
`midi = 69 + 12·log2(f / refA4)`, `cents = 100·(midi − round(midi))`,
`targetHz = refA4 · 2^((midi − 69)/12)`, and distance to a string as
`1200·log2(f / targetHz)`.

**Rationale**: A single logarithmic path guarantees that chromatic mode, auto mode, and manual
mode agree, and that changing the reference pitch rescales every target consistently. Comparing
frequencies in hertz would put the midpoint between E2 and A2 at 96.2 Hz instead of the correct
pitch midpoint, 95.2 Hz.

**Alternatives considered**: precomputing target frequencies at build time (breaks the
configurable reference pitch); hertz-domain interpolation (mathematically wrong for intervals).

## R7. Target selection, hysteresis, and ambiguity

**Decision**: Sort the tuned strings by absolute cent distance. Let `d1` be the nearest and
`d2` the runner-up. A reading is ambiguous when `d1 > 50` and `d2 − d1 ≤ 100 + ε` (ε = 1e-6 to
absorb floating-point error at the exact boundary). The target changes only when a candidate is
closer by at least 15 cents continuously for 300 ms. On an exact tie with no previous target,
the thicker (lower MIDI) string wins. Manual mode bypasses the selector entirely.

**Rationale**: The 100-cent window is one semitone wide around each midpoint, so the ambiguous
state appears only when the reading genuinely belongs to neither string. A string 153 cents
sharp of E2 is still 191 cents closer to E2 than to A2, so it keeps a usable direction instead
of falling into a dead state. The 15-cent margin plus 300 ms dwell is below the ~5-semitone
string spacing, so it cannot mask a real string change, but it exceeds frame-to-frame noise.

**Worked truth table (Standard tuning, A4 = 440 Hz)**:

| Input | Nearest | d1 | Runner-up | d2 | d2 − d1 | Result |
| --- | --- | --- | --- | --- | --- | --- |
| 110.00 Hz | A2 | 0.0 ¢ | E2 | 500.0 ¢ | 500.0 | In tune, A2 |
| 109.00 Hz | A2 | −15.8 ¢ | E2 | 484.2 ¢ | 468.4 | Flat, A2 |
| 90.00 Hz | E2 | +152.5 ¢ | A2 | 347.5 ¢ | 195.0 | Sharp, E2 (pegged) |
| 75.30 Hz | E2 | −156.0 ¢ | A2 | 656.0 ¢ | 500.0 | Flat, E2 (pegged) |
| 95.18 Hz | E2 | +250.0 ¢ | A2 | 250.0 ¢ | 0.0 | Between strings |
| 98.00 Hz | A2 | −200.0 ¢ | E2 | 300.0 ¢ | 100.0 | Between strings (inclusive boundary) |
| 220.00 Hz | G3 | +200.0 ¢ | B3 | 200.0 ¢ | 0.0 | Between strings |

The 98 Hz row lands exactly on the inclusive boundary (`d2 − d1 = 100`), which is why the `ε`
tolerance and a dedicated boundary test are required.

**Alternatives considered**: always picking the nearest string (flaps at midpoints and reports
a meaningless ±250 cent "Sharp"); a fixed ±50 cent match window (a slack string at +153 would
show no target at all); hertz-based distance (biases toward high strings).

## R8. Needle rendering and transitions

**Decision**: Render the gauge as SVG plus a CSS-transformed needle driven by a single
`requestAnimationFrame` loop reading a signal. Interpolate toward the target with a 120 ms
ease-out. When the target changes, fade the needle out over 80 ms, reposition, and fade in over
120 ms. Under `prefers-reduced-motion`, snap immediately with no fade.

**Rationale**: A continuous rAF loop with easing produces smooth motion without triggering
Angular change detection per frame. The reset-on-target-change behavior is required by FR-018
so a five-semitone retarget never looks like a large tuning error.

**Alternatives considered**: CSS transitions on a changing transform (fights the rAF updates and
stutters under load); animating in Angular templates (excessive change detection); sweeping the
needle to the new offset (misleading).

## R9. Microphone permission and lifecycle

**Decision**: Use `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false,
noiseSuppression: false, autoGainControl: false } })` inside an explicit user-started session.
The rationale screen renders before the call. On stop, navigation, `appStateChange` to
background/inactive, or `visibilitychange` to hidden, call `track.stop()`, disconnect the
worklet node, and close the AudioContext. A ~40-line custom Capacitor plugin opens the OS app
settings page for recovery after a permanent denial.

**Rationale**: Disabling echo cancellation, noise suppression, and auto gain is essential —
these filters are tuned for speech and distort sustained tones, which directly harms accuracy.
Capacitor's Android WebView bridges `getUserMedia` to the platform runtime permission when
`RECORD_AUDIO` is declared, so no extra plugin is needed to request access. Explicit teardown
is the only way to satisfy the "microphone released within one second" criterion, because a
suspended context can keep the capture device open on some Android WebView versions.

**Alternatives considered**: a third-party microphone plugin (adds a dependency for behavior the
WebView already provides); leaving echo cancellation on (measurable pitch bias and dropouts);
relying on page visibility alone (misses Android's `appStateChange`).

## R10. Permission error taxonomy

**Decision**: Map failures to four user-facing cases: `denied` (`NotAllowedError`),
`unavailable` (`NotFoundError` / `OverconstrainedError`), `busy` (`NotReadableError` /
`AbortError`), and `unsupported` (no `mediaDevices` or no AudioWorklet). Each has a distinct
message and next action; only `denied` offers the settings deep link.

**Rationale**: The spec requires a helpful message for denial and for a busy or missing device,
and these causes need different remedies. Collapsing them into one generic error would fail
FR-003 and FR-030.

**Alternatives considered**: a single error dialog (unhelpful); logging the raw error (leaks
nothing sensitive but is useless to the user).

## R11. Storage and migration

**Decision**: Persist a single JSON document under one Preferences key with
`schemaVersion: 1`. Validate on load; on unknown or corrupt data, fall back to defaults and keep
the corrupt payload under a separate diagnostic key rather than overwriting it silently. Write
on change with a 250 ms debounce.

**Rationale**: The data is tiny (settings plus a handful of tunings), so a document store is
simpler than a table and easy to migrate. Debouncing avoids hammering native storage while the
user drags a slider. Retaining corrupt data preserves a recovery path without showing it to the
user.

**Alternatives considered**: IndexedDB (overkill, awkward in Capacitor); individual keys per
setting (more round trips, harder to version atomically); no persistence (fails FR-026).

## R12. Privacy enforcement

**Decision**: Android manifest declares only `RECORD_AUDIO` and omits `INTERNET` entirely. The
web build ships `Content-Security-Policy: default-src 'self'; connect-src 'none';
media-src 'none'; object-src 'none'`. No analytics, crash-reporting, or font CDNs; all assets
are bundled. PCM frames live only in the worklet/worker/main-thread handoff and are not retained
after processing.

**Rationale**: Promises in a privacy policy are weaker than an OS-enforced guarantee. Without
the `INTERNET` permission, an Android build cannot exfiltrate audio even if a dependency tried
to; `connect-src 'none'` provides the equivalent guarantee on the web. `media-src 'none'`
prevents any accidental recording playback path.

**Alternatives considered**: keeping `INTERNET` "just in case" (defeats the guarantee); network
allow-listing (still permits an endpoint); a runtime privacy toggle (unnecessary when the
capability is absent).

## R13. Theming and accessibility

**Decision**: Theme through CSS custom properties on `:root` and a `data-theme` attribute;
default to `prefers-color-scheme` and allow explicit light/dark. The state label is an
`aria-live="polite"` region; the gauge is `role="meter"` with `aria-valuemin/max/now` in cents
and an `aria-valuetext` such as "A2, 12 cents flat, Flat"; controls are at least 44×44 points.

**Rationale**: A single source of colour tokens avoids duplicated Ionic palette overrides and
guarantees both themes meet contrast requirements. Announcing every reading would flood a screen
reader, so announcements are throttled to state changes (Flat → In tune), while `aria-valuetext`
carries the numeric detail on demand.

**Alternatives considered**: per-component style duplication (drifts and breaks contrast);
`aria-live="assertive"` (interrupts the user); colour-only needle cues (explicitly prohibited).

## R14. Test strategy

**Decision**: Three layers. (1) Vitest unit tests over `core/dsp` and `core/tuning` using
generated sine frames and harmonic-rich pluck fixtures with known ground truth, asserting cent
error numerically. (2) Vitest component tests for state rendering and ARIA output. (3)
Playwright web E2E with `--use-fake-device-for-media-stream` and a WAV fixture covering the
full tune-a-string journey, plus manual device checks for permission and backgrounding, which
automation cannot faithfully simulate.

**Rationale**: The DSP is where accuracy regressions hide, so it gets deterministic, fast,
numeric tests. Device lifecycle behavior is platform-specific and only trustworthy on real
hardware. Fake-audio Chrome flags make the happy path reproducible in CI without a microphone.

**Alternatives considered**: recording real guitar samples only (not reproducible in CI, hard to
label to 1 cent); mocking the detector in E2E (proves nothing about accuracy); manual-only
testing (regressions ship).

## R15. Build and packaging

**Decision**: Angular CLI build with the Ionic builder output to `www/`, then `npx cap sync`.
Android release uses a signed AAB with `minSdkVersion 24`, `targetSdkVersion` current, and no
`INTERNET` permission. Web deploys the same static build with a service worker for offline use
and the CSP above.

**Rationale**: A single build artifact feeds all three targets, keeping behavior identical as the
spec requires. Removing `INTERNET` is a manifest-only change with no functional cost because the
app has no server.

**Alternatives considered**: separate native implementations per platform (violates the stack
constraint and triples maintenance); a hosted web wrapper (requires network, contradicts
offline operation).
