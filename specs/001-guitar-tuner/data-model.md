# Phase 1 Data Model: Guitar Tuner Mobile App

All pitch values are derived from `referenceHz` (A4, 415-466 Hz, default 440). Nothing in this
model is persisted as audio; only the entities below are stored, and only `CustomTuning`,
`UserSettings`, and the last-used selections.

## Conventions

- **Cents**: `1200 · log2(f / targetHz)`. Positive = sharp, negative = flat.
- **MIDI**: `69 + 12 · log2(f / referenceHz)`; A4 = 69. Fractional MIDI is used internally.
- **Note name**: sharp spellings for chromatic mode (`C, C#, D, D#, E, F, F#, G, G#, A, A#, B`);
  presets keep their authored spellings (`F#3`, `G#3`, `Eb2`, `Bb3`).
- **String order**: `order` is the zero-based display index from thickest to thinnest.
  `stringNumber` is the conventional label shown to users (guitar 6→1, bass and ukulele 4→1).
  For ukulele, order 0 is G4 even though it is pitched above C4 (reentrant tuning).
- **Epsilon**: comparisons at the ambiguity boundary use `ε = 1e-6` to absorb floating-point
  drift.

## Entities

### TuningString

| Field | Type | Constraints |
| --- | --- | --- |
| `order` | number | 0..7, unique within its tuning |
| `stringNumber` | number | 1..8, unique within its tuning |
| `note` | string | one of the 12 pitch classes; authored spelling preserved |
| `octave` | number | -1..9 |
| `midi` | number | integer 0..127, equals `12·(octave+1) + pitchClass` |

Derived at read time, never stored: `targetHz = referenceHz · 2^((midi − 69) / 12)`.

Validation: `note` and `octave` must agree with `midi`; a preset is invalid if two strings share
`order` or `stringNumber`.

### TuningPreset

| Field | Type | Constraints |
| --- | --- | --- |
| `id` | string | slug, unique; built-ins use stable ids such as `guitar-standard` |
| `name` | string | 1..40 characters, displayed |
| `family` | enum | `guitar` \| `bass` \| `ukulele` \| `custom` |
| `builtIn` | boolean | true for the 11 shipped presets |
| `strings` | TuningString[] | 4..8 entries, ordered by `order` |

Invariants:

- Built-in presets are immutable at runtime; editing one prompts "Save as custom tuning".
- The 11 built-ins and their exact notes are fixed by FR-019.

### CustomTuning

Extends `TuningPreset` with `family = "custom"`, `builtIn = false`, plus:

| Field | Type | Constraints |
| --- | --- | --- |
| `id` | string | generated UUID; never reuses a built-in id |
| `createdAt` | string | ISO 8601 |
| `updatedAt` | string | ISO 8601, ≥ `createdAt` |

Validation (FR-021):

- `strings.length` in 4..8.
- Every string has a note and octave; no empty slots.
- `name` trimmed, 1..40 characters, unique among custom tunings, case-insensitive.
- Deleting the currently selected tuning falls back to `guitar-standard`.
- Renaming while selected updates the display immediately.

### UserSettings

| Field | Type | Default | Validation |
| --- | --- | --- | --- |
| `referenceHz` | number | 440 | integer 415..466 |
| `toleranceCents` | number | 5 | integer 1..50 |
| `theme` | enum | `system` | `system` \| `light` \| `dark` |
| `lastMode` | enum | `auto` | `auto` \| `manual` \| `chromatic` |
| `lastTuningId` | string | `guitar-standard` | must resolve to an existing preset |
| `lastStringOrderByTuning` | record | `{}` | values must be valid `order` for that tuning |

Any invalid field is replaced by its default on load; the rest of the document is preserved.

### TargetCandidate

One evaluated string for the current reading.

| Field | Type | Notes |
| --- | --- | --- |
| `order` | number | display index |
| `stringNumber` | number | conventional label |
| `note` | string, `octave` | note shown to the user |
| `targetHz` | number | derived from `referenceHz` |
| `offsetCents` | number | signed, `1200·log2(f / targetHz)` |
| `distanceCents` | number | `abs(offsetCents)` |

### PitchReading

| Field | Type | Notes |
| --- | --- | --- |
| `frequencyHz` | number | 40..1000 inclusive |
| `midiFloat` | number | fractional MIDI |
| `centsFromNearestNote` | number | −50..+50 |
| `clarity` | number | 0..1 |
| `rmsDb` | number | ≤ 0 |
| `timestampMs` | number | monotonic frame timestamp |
| `quality` | enum | `good` \| `marginal` \| `bad` |

A reading is only surfaced when `quality = good`.

### TargetSelection

| Field | Type | Notes |
| --- | --- | --- |
| `mode` | enum | `auto` \| `manual` \| `chromatic` |
| `selected` | TuningString \| null | null in chromatic mode and in the ambiguous state |
| `runnerUp` | TuningString \| null | nearest string other than `selected` |
| `candidates` | TargetCandidate[] | sorted by `distanceCents` ascending |
| `nearestDistance` | number | `d1` |
| `runnerUpDistance` | number | `d2` |
| `ambiguous` | boolean | `d1 > 50 && (d2 − d1) ≤ 100 + ε` |
| `reason` | enum | `nearest` \| `ambiguous` \| `manual` \| `chromatic` \| `none` |

### TuningSession

| Field | Type | Notes |
| --- | --- | --- |
| `state` | enum | see state machine |
| `mode` | enum | mirrors `UserSettings.lastMode` |
| `tuningId` | string | active preset or custom tuning |
| `referenceHz` | number | snapshot taken at start; changing it updates live |
| `toleranceCents` | number | live |
| `lockedStringOrder` | number \| null | manual mode only |
| `errorReason` | enum \| null | `denied` \| `unavailable` \| `busy` \| `unsupported` |
| `startedAtMs` | number \| null | null while idle |

## Session State Machine

```text
                start()                 granted
   idle ──────────────────► requestingPermission ──────► listening
     ▲                            │                         │  ▲
     │                            │ denied                  │  │ 3 good frames
     │                            ▼                         │  │
     │                          denied                    reading ◄──► betweenStrings
     │                            │                         │  (ambiguous for 300 ms)
     │                            │ unavailable/busy/       │
     │                            │ unsupported             │ 3 bad frames / silence
     │                            ▼                         ▼
     │                          error ◄───────────────── listening
     │                            │
     └──────── stop(), navigation, background, OS interrupt ───────┘
```

| From | Trigger | To | Guard / action |
| --- | --- | --- | --- |
| `idle` | Start tapped | `requestingPermission` | Capture not started yet |
| `requestingPermission` | Permission granted | `listening` | Start worklet + worker |
| `requestingPermission` | `NotAllowedError` | `denied` | No capture; offer settings link |
| `requestingPermission` | Other getUserMedia error | `error` | Map to `unavailable` / `busy` / `unsupported` |
| `listening` | 3 consecutive good frames | `reading` | Select target |
| `reading` | 3 consecutive bad frames | `listening` | Clear or mark display stale |
| `reading` | Ambiguous condition held 300 ms | `betweenStrings` | Clear selected target |
| `betweenStrings` | Non-ambiguous good frames held 300 ms | `reading` | Select nearest target |
| `reading` / `betweenStrings` / `listening` | Stop, route leave, background, OS interrupt | `idle` | `track.stop()`, close context within 1 s |
| `denied` / `error` | Retry tapped | `requestingPermission` | Re-attempt only on explicit action |

Hard invariants:

1. Microphone tracks exist only in `listening`, `reading`, and `betweenStrings`.
2. Every transition out of those states completes teardown before the UI reports `idle`.
3. No reading is displayed in `denied`, `error`, or `idle`.
4. `betweenStrings` never shows "In tune" and never marks a target as selected.

## Persisted Document

Stored under one Preferences key, `zemu.tuner.state.v1`:

```json
{
  "schemaVersion": 1,
  "settings": {
    "referenceHz": 440,
    "toleranceCents": 5,
    "theme": "system",
    "lastMode": "auto",
    "lastTuningId": "guitar-standard",
    "lastStringOrderByTuning": { "guitar-standard": 0 }
  },
  "customTunings": [
    {
      "id": "b1f0c1a2-...",
      "name": "Open C",
      "family": "custom",
      "builtIn": false,
      "createdAt": "2026-10-22T10:00:00.000Z",
      "updatedAt": "2026-10-22T10:00:00.000Z",
      "strings": [
        { "order": 0, "stringNumber": 6, "note": "C", "octave": 2, "midi": 36 },
        { "order": 1, "stringNumber": 5, "note": "G", "octave": 2, "midi": 43 },
        { "order": 2, "stringNumber": 4, "note": "C", "octave": 3, "midi": 48 },
        { "order": 3, "stringNumber": 3, "note": "G", "octave": 3, "midi": 55 },
        { "order": 4, "stringNumber": 2, "note": "C", "octave": 4, "midi": 60 },
        { "order": 5, "stringNumber": 1, "note": "E", "octave": 4, "midi": 64 }
      ]
    }
  ]
}
```

Rules:

- `schemaVersion` mismatch triggers a migration function; unknown future versions are treated as
  corrupt (defaults load, payload retained under `zemu.tuner.state.corrupt`).
- Writes are debounced 250 ms and atomic (single `set`).
- The document must validate against the constraints above before use.
- No audio, no pitch history, no timestamps of tuning sessions are persisted.

## Derived Calculations

```text
targetHz(string, referenceHz) = referenceHz · 2^((string.midi − 69) / 12)
offsetCents(f, target)        = 1200 · log2(f / target)
nearestNoteMidi(f, referenceHz) = round(69 + 12 · log2(f / referenceHz))
noteTargetHz(midi, referenceHz) = referenceHz · 2^((midi − 69) / 12)
```

Rounding: display note names from integer MIDI; display cents as a signed whole number, rounding
half away from zero; display hertz to one decimal place.
