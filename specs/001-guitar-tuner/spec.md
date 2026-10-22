# Feature Specification: Guitar Tuner Mobile App

**Feature Branch**: `001-guitar-tuner`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Build a guitar tuner mobile app that lets a guitarist tune
their instrument using the phone's microphone: start tuning, play a string, and immediately
see how far off the pitch is on an analog-style needle gauge (flat left, sharp right, center
zone in tune), with the detected note name, detected frequency, target frequency, cent
offset, and a text state label (Flat / Sharp / In tune). Auto, manual, and chromatic tuning
modes; guitar, bass, ukulele, and user-defined custom tunings; adjustable reference pitch
(415-466 Hz, default 440), adjustable in-tune tolerance (default 5 cents), light and dark
themes; smooth non-jittering needle with an idle state on silence or noise; microphone
requested only when tuning starts and released on leave/background; offline, no sign-up,
audio never recorded, stored, or sent; Android primary, with iOS and web browsers also
supported."

## Clarifications

### Session 2026-10-22

- Q: What happens when the user plucks a pitch that falls between two string targets in Auto
  mode? → A: Distances are compared in cents. If the nearest target is more than 50 cents
  away and the runner-up string is within 100 cents of the same distance, the app enters a
  "Between strings" state: the needle returns to center and dims, both candidate strings and
  their signed offsets are shown, and neither "In tune" nor a single Flat/Sharp target is
  claimed. Otherwise the normal nearest-target behaviour applies, with 15-cent / 300 ms
  hysteresis and a thicker-string tie-break.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tune a string in Auto mode (Priority: P1)

A guitarist opens the app, taps Start, plays a string, and immediately sees a needle gauge
showing whether the string is flat or sharp, plus the detected note, detected frequency,
target frequency, cent offset, and a plain-text state label. Once the string is within the
allowed tolerance, the needle rests in the center zone and the label reads "In tune".

**Why this priority**: This is the entire value of the product. Without a trustworthy live
reading there is no tuner, so this story alone is a viable MVP.

**Independent Test**: With microphone access granted, start a session and play a reference
tone or a real string; confirm the needle, numeric readouts, and state label track the
pitch, and that the label reads "In tune" only inside the tolerance.

**Acceptance Scenarios**:

1. **Given** the user is on the tuner screen and has not yet granted microphone access,
   **When** they tap Start, **Then** the app explains why the microphone is needed and
   requests access, and no audio capture happens before that tap.
2. **Given** an active session and Standard tuning, **When** the user plays a string that is
   flat, **Then** the needle moves left of center, the offset is shown as a negative cent
   value, and the label reads "Flat".
3. **Given** an active session, **When** the user plays a string that is sharp, **Then** the
   needle moves right of center, the offset is shown as a positive cent value, and the label
   reads "Sharp".
4. **Given** an active session and a string inside the tolerance band, **When** the reading
   settles, **Then** the needle rests in the center zone, the text label reads "In tune",
   and the indicated string matches the string being played.
5. **Given** an active session, **When** the pitch is roughly midway between two strings
   (for example 220 Hz between G3 and B3 in Standard tuning), **Then** the needle returns to
   center and dims, the label reads "Between strings", both candidates and their signed
   offsets are shown, and neither "In tune" nor a single Flat/Sharp claim is made.
6. **Given** an active session, **When** the user taps Stop, **Then** capture ends
   immediately, the reading is cleared, and the screen returns to an idle state.
7. **Given** an active session, **When** the user holds a steady note, **Then** the needle
   settles without visible jitter and the displayed offset stays stable.

---

### User Story 2 - Microphone permission, release, and privacy (Priority: P1)

A user is asked for microphone access only when it is actually needed, is told why, gets a
helpful recovery path when they decline, and can trust that the microphone is off whenever
they are not tuning and that nothing is recorded or sent anywhere.

**Why this priority**: Mishandled microphone access is both a privacy violation and the most
common cause of a tuner app being unusable or uninstalled. It is a launch blocker alongside
the core reading.

**Independent Test**: Install fresh, deny permission, confirm the recovery message and that
the rest of the app still works; then grant permission, start and stop tuning, background the
app, and confirm the operating system's microphone indicator turns off each time.

**Acceptance Scenarios**:

1. **Given** a first launch, **When** the app opens, **Then** no microphone prompt appears
   and no capture occurs until the user explicitly starts tuning.
2. **Given** the permission prompt, **When** the user declines, **Then** the app shows a
   plain-language explanation of what is blocked and how to enable access later, and the
   user can still browse tunings, settings, and help content.
3. **Given** an active tuning session, **When** the user navigates back, switches screens, or
   backgrounds the app, **Then** capture stops and the microphone is released within one
   second.
4. **Given** a session was interrupted by backgrounding, **When** the user returns, **Then**
   the app shows the idle state and requires an explicit Start before capturing again.
5. **Given** any completed session, **When** the user inspects the device's storage or
   network activity, **Then** no audio recording exists and no audio has been transmitted.

---

### User Story 3 - Lock a specific string in Manual mode (Priority: P2)

A guitarist selects a specific string, such as the 6th string E, and the tuner measures only
against that string, so nearby strings and sympathetic resonance do not pull the reading to
the wrong target.

**Why this priority**: Experienced players and noisy environments need a deterministic
target; it is the most requested behavior after basic tuning works.

**Independent Test**: Select a single string, play that string, and confirm the target and
cents are always computed against it even when another string would be a closer match.

**Acceptance Scenarios**:

1. **Given** Manual mode, **When** the user taps a string in the tuning, **Then** that string
   becomes the fixed target and is shown as selected.
2. **Given** a locked target, **When** the user plays a different string, **Then** the app
   does not silently retarget; it indicates that the detected pitch is far from the locked
   string and suggests the string that matches.
3. **Given** a locked target, **When** the user switches to a different tuning, **Then** the
   target is cleared or reset to a valid string of the new tuning.

---

### User Story 4 - Tune any instrument in Chromatic mode (Priority: P2)

A user tuning a non-guitar instrument sees the nearest note of the chromatic scale and
whether it is flat or sharp, without any string concept.

**Why this priority**: It reuses the same detection work to serve bassists, ukulele players,
and other instruments, widening usefulness at low cost.

**Independent Test**: Enter Chromatic mode and play notes across the supported range; confirm
the nearest note name plus octave and cent offset are correct with no string selection.

**Acceptance Scenarios**:

1. **Given** Chromatic mode, **When** the user plays any note in the supported range,
   **Then** the nearest chromatic note with octave, its target frequency, and the cent
   offset are shown.
2. **Given** Chromatic mode, **When** the user plays a note exactly between two semitones,
   **Then** the app shows one deterministic nearest note and a corresponding offset near
   half a semitone, and does not flicker between the two.

---

### User Story 5 - Choose a tuning standard (Priority: P2)

The user picks from built-in tunings for guitar, bass, and ukulele instead of being limited
to standard guitar tuning.

**Why this priority**: Alternate tunings are the norm for many players, and the preset list
is explicitly part of this release.

**Independent Test**: Select each preset and verify the string names, octaves, and target
frequencies shown match the preset definition, including the detuned presets.

**Acceptance Scenarios**:

1. **Given** the tuning picker, **When** the user selects any preset, **Then** the string
   list, labels, and target frequencies update to that preset before the next reading.
2. **Given** an active session, **When** the user changes the tuning, **Then** subsequent
   readings use the new targets without requiring a restart.
3. **Given** the user has chosen a tuning, **When** they close and reopen the app, **Then**
   the same tuning is restored.

---

### User Story 6 - Create and save a custom tuning (Priority: P3)

A player with an unusual tuning defines each string's note and octave, names it, and reuses
it later like a built-in preset.

**Why this priority**: It covers long-tail tunings without hard-coding every possibility, but
the shipped presets already serve most users.

**Independent Test**: Create a tuning with a non-standard set of notes, save it, restart the
app, and tune against it.

**Acceptance Scenarios**:

1. **Given** the custom tuning editor, **When** the user sets a note and octave for every
   string and saves with a name, **Then** the tuning appears in the picker and can be
   selected.
2. **Given** a saved custom tuning, **When** the user renames or deletes it, **Then** the
   picker and any active target reflect the change.
3. **Given** an incomplete custom tuning, **When** the user tries to save, **Then** the app
   blocks the save and identifies the missing string.

---

### User Story 7 - Personalize reference pitch, tolerance, and theme (Priority: P3)

The user matches the app to an ensemble's tuning reference, widens or tightens what counts as
in tune, and picks a light or dark appearance.

**Why this priority**: Important for accuracy-sensitive and stage users, but defaults are
sensible enough that the app is usable without touching them.

**Independent Test**: Change each setting, confirm the effect is immediate on the tuner
behaviour and survives a restart.

**Acceptance Scenarios**:

1. **Given** settings, **When** the user changes the reference pitch from 440 Hz to another
   allowed value, **Then** every target frequency and cent offset is recomputed from the new
   reference immediately.
2. **Given** settings, **When** the user changes the in-tune tolerance, **Then** the center
   zone width and the "In tune" condition change to match, and a reading that was in tune
   may correctly become flat or sharp.
3. **Given** settings, **When** the user switches between light and dark theme, **Then** the
   whole app updates immediately and the choice persists after restart.

---

### Edge Cases

- **Silence or room noise**: When no stable pitch is present, the app shows an idle/listening
  state within half a second and never presents the previous reading as current.
- **Very noisy input**: When signal quality is too poor for a reliable answer, the app
  reports uncertainty or idle rather than guessing a note.
- **Pitch midway between two strings** (Auto mode): When the nearest target is more than
  50 cents away and the runner-up is within 100 cents of the same distance, the app shows
  "Between strings" with both candidates, returns the needle to center, and never displays
  "In tune". Examples in Standard tuning: 95.2 Hz (between E2 and A2) and 220 Hz (between
  G3 and B3).
- **Pitch far from one string but closer to another** (Auto mode): When the nearest target is
  more than 50 cents away and clearly closer than the runner-up, the app keeps that target,
  pins the needle at the edge of its scale, shows the true offset numerically, and adds a
  "far off" hint. A pitch 152.5 cents above E2 (about 90 Hz) therefore reports "Sharp
  +152.5", and one 156 cents below E2 (about 75.3 Hz) reports "Flat -156".
- **Pitch exactly at the tolerance boundary**: A reading at exactly the configured tolerance
  counts as in tune, consistently on the flat and sharp side.
- **Harmonics and octave errors**: A strong harmonic must not produce a target one octave
  away from the played string; the reported note must match the played fundamental.
- **Changing strings while tuning**: The target may switch only after the new pitch is
  consistently closer by at least 15 cents for 300 ms, so the needle does not flap between
  adjacent strings. On an exact tie with no prior target, the thicker (lower-pitched) string
  wins.
- **One pitch belongs to two strings**: G3 is open string 3 and also string 6 at fret 3; B3,
  E4, E2, A2 and D3 repeat similarly. Auto mode reports the open string whose target matches
  the pitch, which is correct for tuning open strings; the pitch feedback remains accurate
  when the user is fretting another string, and Manual mode is the unambiguous alternative.
- **String far outside the gauge scale**: Beyond the displayed cent range, the needle pins at
  the end of the scale and shows the direction and the out-of-range offset numerically.
- **Target changes while the needle is moving**: The needle must not sweep across the dial
  when the target changes; it resets to center and re-enters, so the motion is never
  mistaken for a large tuning error.
- **Reference pitch changed mid-session**: The displayed target and cents update
  immediately; the needle does not keep a stale target.
- **Permission permanently denied or restricted by the device**: The app explains how to
  re-enable access instead of re-prompting in a loop.
- **Microphone busy or unavailable** (another app is recording, no input device, unsupported
  browser): The app shows an actionable message and stays usable without tuning.
- **App backgrounded, screen locked, or interrupted by a call**: Capture stops and the
  microphone is released; returning requires an explicit Start.
- **Web browser tab hidden or closed**: Capture stops and the microphone is released.
- **Custom tuning with fewer or more strings than a guitar** (for example 4-string bass or a
  7-string guitar): String selection, Auto mode, and the gauge all adapt to the string count.
- **Duplicate notes in a custom tuning**: The tuning is still usable, and Auto mode selects
  the closest instance without ambiguity in the displayed target.
- **Tolerance set to its minimum or maximum**: The center zone remains visible and legible at
  both extremes rather than collapsing to a line or covering the whole scale.
- **Very low bass notes**: The lowest supported bass string is detected and tuned, not treated
  as noise.
- **Accessibility**: Screen-reader users can determine flat/sharp/in-tune state, all controls
  are labelled, and the needle does not rely on color alone.
- **Reduced-motion preference**: Users who request reduced motion get a non-animated but still
  clear indication of direction.

## Requirements *(mandatory)*

### Functional Requirements

**Tuning session and display**

- **FR-001**: The tuner screen MUST present a Start control that begins a tuning session, and
  microphone access MUST be requested only as a result of that explicit user action.
- **FR-002**: At the moment access is requested, the app MUST explain, in plain language, that
  the microphone is used only to measure pitch in real time, and that audio is not stored or
  sent.
- **FR-003**: If access is denied, the app MUST show an explanation of what is unavailable,
  how to grant access later, and MUST leave the remaining features (tunings, custom tunings,
  settings, help) usable.
- **FR-004**: During an active session, the app MUST update the reading at least 10 times per
  second, MUST present a stable reading within 150 milliseconds of a note being played, and
  MUST settle within 1 second.
- **FR-005**: The app MUST display an analog-style needle gauge whose position is proportional
  to the signed cent offset, moving left for flat and right for sharp, with a visible center
  zone representing the configured in-tune tolerance and a scale extending to at least
  plus/minus 50 cents.
- **FR-006**: The needle MUST be smoothed so that a held note does not visibly jitter; after
  settling, the displayed offset MUST NOT vary by more than 1 cent for a steadily played note.
- **FR-007**: The app MUST display, below the gauge, the detected note name with octave, the
  detected frequency in hertz to one decimal place, the target frequency in hertz to one
  decimal place, and the signed cent offset as a whole number.
- **FR-008**: The app MUST display a text state label from a fixed vocabulary — "Flat",
  "Sharp", "In tune", "Between strings", or "Listening" (localizable) — and MUST convey the
  same state through at least one non-color cue such as the label text, an icon, or the
  needle position. "In tune" MUST appear only when a single target is selected and the
  absolute offset is within tolerance.
- **FR-009**: When input is silence or too noisy for a reliable reading, the app MUST enter a
  "Listening" state within 500 milliseconds, MUST clear or explicitly mark stale numeric
  values, and MUST NOT display "In tune" for an unverified reading.
- **FR-010**: The app MUST stop capture and release the microphone when the user stops tuning,
  leaves the tuner screen, backgrounds the app, or the operating system interrupts capture;
  resuming MUST require an explicit Start.

**Tuning modes and target selection**

- **FR-011**: All target distances MUST be computed in cents relative to the configured
  reference pitch, never by comparing hertz values directly, so that the midpoint between two
  targets is the geometric pitch midpoint.
- **FR-012**: Auto mode MUST select, from the active tuning, the string whose target pitch is
  nearest to the detected pitch in cents, MUST display which string (number and note) is
  targeted, and MUST change the target only when a new string has been closer by at least
  15 cents continuously for 300 milliseconds. On an exact tie with no previously selected
  target, the thicker (lower-pitched) string MUST win.
- **FR-013**: When the nearest target is more than 50 cents away and the runner-up target is
  within 100 cents of the same distance, Auto mode MUST enter a "Between strings" state:
  needle centered and visually de-emphasized, both candidate strings listed with their signed
  cent offsets, no target marked as selected, and no "In tune" or single-direction Flat/Sharp
  claim. The state MUST clear once a reading is no longer ambiguous for 300 milliseconds.
- **FR-014**: When the nearest target is more than 50 cents away but clearly closer than the
  runner-up, Auto mode MUST keep that target, pin the needle at the scale edge, show the true
  offset numerically, and add a "far off" hint.
- **FR-015**: Manual mode MUST let the user select a specific string, MUST measure the needle
  and offsets against that string only, and MUST indicate when the detected pitch is more than
  100 cents away from the locked target, including a hint of the string that would match.
  Manual mode MUST NOT enter the "Between strings" state.
- **FR-016**: Chromatic mode MUST display the nearest note of the twelve-tone scale with its
  octave, the target frequency for that note under the configured reference pitch, and the
  cent offset, without any string selection. It MUST use a 8-cent boundary hysteresis with a
  300-millisecond dwell, and an exact tie between semitones MUST resolve to the higher note.
- **FR-017**: The app MUST detect pitches across the full range needed by the supported
  instruments, at minimum from 40 Hz to 1000 Hz, and MUST report a confidence/quality state
  so that unreliable readings are not presented as valid.
- **FR-018**: When the selected target changes, the needle MUST reset to center and re-enter
  rather than sweep across the dial, and smoothing state from the previous target MUST NOT
  be carried over.

**Tunings**

- **FR-019**: The app MUST ship the following built-in tunings with exact string notes and
  octaves, listed from thickest to thinnest in conventional string-number order (guitar 6th
  to 1st, bass and ukulele 4th to 1st):
  - Guitar Standard: E2, A2, D3, G3, B3, E4
  - Guitar Drop D: D2, A2, D3, G3, B3, E4
  - Guitar Double Drop D: D2, A2, D3, G3, B3, D4
  - Guitar Open G: D2, G2, D3, G3, B3, D4
  - Guitar Open D: D2, A2, D3, F#3, A3, D4
  - Guitar Open E: E2, B2, E3, G#3, B3, E4
  - Guitar DADGAD: D2, A2, D3, G3, A3, D4
  - Guitar Half-step down: Eb2, Ab2, Db3, Gb3, Bb3, Eb4
  - Guitar Full-step down: D2, G2, C3, F3, A3, D4
  - Bass (4-string): E1, A1, D2, G2
  - Ukulele: G4, C4, E4, A4 (reentrant; the G string is higher than the C string)
- **FR-020**: Changing the active tuning MUST take effect for the next reading, including
  during an active session, and MUST NOT require restarting the session.
- **FR-021**: Users MUST be able to create a custom tuning by choosing a note and octave for
  each string, with a configurable string count from 4 to 8 (default 6), MUST be able to name
  it, save it, rename it, and delete it, and MUST be able to select it like a built-in tuning.
  Saving MUST require every string to be defined and the name to be non-empty and unique.
- **FR-022**: On first launch the app MUST use Guitar Standard, and on later launches MUST
  restore the most recently used tuning and mode.

**Settings**

- **FR-023**: Users MUST be able to set the reference pitch for A4 anywhere from 415 Hz to
  466 Hz in 1 Hz steps, defaulting to 440 Hz, and every target frequency and cent offset MUST
  be derived from that value, applied immediately.
- **FR-024**: Users MUST be able to set the in-tune tolerance from 1 to 50 cents in whole
  cents, defaulting to 5 cents, and the center zone and "In tune" condition MUST follow the
  configured value immediately.
- **FR-025**: Users MUST be able to choose light or dark theme, with the system preference as
  the initial default, applied immediately and persisted.
- **FR-026**: The app MUST persist settings, custom tunings, and the last used mode and tuning
  on the device across restarts, with no account required.

**Privacy, platform, and accessibility**

- **FR-027**: The app MUST function fully offline after installation or first load, MUST NOT
  require sign-up or an account, and MUST NOT require network access to tune.
- **FR-028**: The app MUST NOT record, store, or transmit microphone audio, MUST NOT create
  audio files, and MUST discard captured audio after pitch measurement; no audio-derived data
  may leave the device.
- **FR-029**: The app MUST run on Android as the primary target, and MUST also run on iOS and
  in web browsers, with identical core tuning behaviour; where a platform capability is
  missing, the app MUST explain the limitation rather than fail silently.
- **FR-030**: The app MUST remain usable when the microphone is unavailable, busy, or denied,
  showing an actionable message instead of an error state that blocks the whole app.
- **FR-031**: All interactive controls MUST have accessible names, all touch targets MUST be
  at least 44 by 44 points, both themes MUST meet WCAG 2.1 AA contrast, and the tuner state
  MUST be readable by a screen reader; motion MUST respect the system reduced-motion setting.

### Key Entities *(include if data involves pitch, tuning, or settings)*

- **Tuning Preset**: A named collection of strings for an instrument family. Attributes:
  name, instrument family (guitar, bass, ukulele), built-in indicator, ordered strings.
- **String**: One course of a tuning. Attributes: position number, note name, octave, and the
  target frequency derived from the current reference pitch.
- **Custom Tuning**: A user-created preset. Attributes: name, ordered strings, created and
  updated timestamps; editable and deletable.
- **Tuning Session**: One period of active capture. Attributes: active mode (auto, manual,
  chromatic), active tuning, locked string (manual mode only), currently selected target,
  runner-up target, reference pitch, tolerance, lifecycle state (idle, requesting access,
  listening, reading, between strings, denied, stopped).
- **Pitch Reading**: One measurement shown to the user. Attributes: detected frequency,
  nearest note and octave, signed cent offset against the selected target, distance to the
  nearest and runner-up targets, whether the reading is ambiguous, reliability/quality state,
  timestamp.
- **User Settings**: Persistent preferences. Attributes: reference pitch, in-tune tolerance,
  theme, last used mode, last used tuning.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a calibration set of steady tones across 40 Hz to 1000 Hz, the note shown is
  correct in 100 percent of cases and the reported cent offset is within 1 cent of the true
  offset.
- **SC-002**: A steady held note produces a stable reading within 150 milliseconds, settles
  within 1 second, and the displayed offset varies by no more than 1 cent thereafter.
- **SC-003**: In a controlled test where a string is detuned by more than twice the tolerance,
  the app reports "In tune" zero times out of 20 attempts.
- **SC-004**: With silence or broadband noise at normal room level, the app shows the idle
  state within 500 milliseconds in at least 95 percent of trials and never shows a fabricated
  note for the duration of a 10-second trial.
- **SC-005**: Every built-in tuning displays the correct number of strings and correct target
  frequencies for all 11 presets, verified by comparison against the preset table in FR-019.
- **SC-006**: 90 percent of first-time users in a moderated test complete a successful tune of
  a single string within 60 seconds of opening the app, without assistance.
- **SC-007**: In 100 percent of first-run sessions, no microphone prompt or capture occurs
  before the user taps Start.
- **SC-008**: The operating system's microphone-in-use indicator turns off within 1 second of
  stopping, leaving the tuner screen, or backgrounding the app, in 10 out of 10 trials.
- **SC-009**: After installation, a full tuning session completes with the device in airplane
  mode and no account, and monitoring shows zero outbound audio or audio-derived data.
- **SC-010**: Users can create, save, and later reuse a custom tuning in under 90 seconds in a
  moderated test.
- **SC-011**: Changing the reference pitch by 5 Hz shifts all displayed target frequencies by
  the expected amount on every preset, with no stale values left on screen.
- **SC-012**: Screen-reader users can determine flat, sharp, in-tune, between-strings, and
  listening state for a sounding note without seeing the gauge, in 5 out of 5 scripted checks.
- **SC-013**: Pitches swept from 50 to 350 cents above a string target produce zero "In tune"
  readings, and pitches within the 100-cent ambiguous window around a midpoint produce the
  "Between strings" state in 20 out of 20 trials.
- **SC-014**: While a steady note is held, the selected target changes at most once per 300
  milliseconds and never oscillates back and forth more than once in 5 seconds.

## Out of Scope (this version)

- Song and chord libraries, tabs, and lessons.
- Metronome.
- Audio recording, playback, or saving clips.
- User accounts, sign-up, profiles, or cloud sync.
- Social features, sharing, or remote analytics on audio.
- Polyphonic chord detection or multi-string simultaneous tuning.
- Instrument-specific advanced workflows beyond the listed guitar, bass, ukulele, and custom
  tunings.

## Assumptions

- **Monophonic input**: Users play one string at a time; the app is not expected to separate
  simultaneous notes. Chords are explicitly out of scope.
- **Cents-domain comparison**: Target selection and offsets are computed logarithmically;
  treating frequency differences in hertz would misplace midpoints between widely spaced
  strings.
- **Detection range**: 40 Hz to 1000 Hz covers the lowest supported bass string (E1, about
  41 Hz) through common guitar and ukulele notes with headroom; notes outside this window are
  treated as out of range rather than guessed.
- **In-tune definition**: "In tune" means a single target is selected and the absolute cent
  offset is less than or equal to the configured tolerance, applied symmetrically on both
  sides.
- **Note naming**: Presets use the spellings given in the requirements (including F#, G#, and
  flats such as Eb and Bb); Chromatic mode defaults to sharp spellings with the octave shown.
- **Custom tuning shape**: Custom tunings have 4 to 8 strings, default 6, listed from
  thickest to thinnest; duplicate notes are permitted.
- **Persistence scope**: Settings, custom tunings, and last-used selections are stored on the
  device only; nothing is synchronized between devices because there is no account system.
- **Microphone source**: The app uses the device's built-in or attached microphone with the
  platform's standard input; no external audio interface configuration is offered.
- **Default experience**: A first-time user lands on the tuner with Guitar Standard and Auto
  mode, follows the system theme, and needs no setup before tuning.
- **Localization**: Only English is required for this version, but user-facing state labels are
  defined as translatable strings.
- **Distribution**: Android is the launch platform; iOS and web builds share the same feature
  set, with platform-specific permission dialogs handled by the operating system.
- **Accuracy target**: The 1-cent accuracy expectation assumes clean, steady input; in noisy
  environments the app is expected to report uncertainty instead of precision.
- **Identical pitches across strings**: Because the same pitch can be produced by an open
  string and by fretting another string, Auto mode identifies the open string that matches the
  pitch; it does not attempt to infer which physical string the user plucked.
