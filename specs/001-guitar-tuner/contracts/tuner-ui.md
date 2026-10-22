# Contract: Tuner UI

**Modules**: `src/app/features/tuner/**`, `src/theme/variables.scss`
**Consumers**: end-to-end tests, accessibility review, visual review
**Type**: UI contract — states, labels, geometry, and accessibility semantics.

## Screen States

The tuner screen renders exactly one of these at a time.

| State | Primary label | Gauge | Numeric readout | Controls |
| --- | --- | --- | --- | --- |
| `idle` | "Tap Start to tune" | Needle centered, dimmed | Placeholder dashes | Start enabled |
| `requestingPermission` | "Waiting for microphone access…" | Hidden | None | Start disabled |
| `denied` | "Microphone access is off" | Hidden | None | Retry + Open settings |
| `error` | Reason-specific message | Hidden | None | Retry |
| `listening` | "Listening…" | Needle centered, dimmed | Dashes or stale values marked `stale` | Stop enabled |
| `reading` | "Flat" / "Sharp" / "In tune" | Needle at offset | Note, detected Hz, target Hz, cents | Stop enabled |
| `betweenStrings` | "Between strings" | Needle centered, dimmed | Both candidates with signed cents | Stop enabled |

Label vocabulary is fixed and localizable: `Flat`, `Sharp`, `In tune`, `Between strings`,
`Listening`. No other tuner-state text may be substituted.

## Needle Geometry

| Property | Value |
| --- | --- |
| Scale | −50 ¢ .. +50 ¢ |
| Angle range | −45° .. +45° (0° = straight up) |
| Mapping | `angle = clamp(cents, −50, 50) / 50 · 45` |
| Center zone | Half-width `toleranceCents / 50 · 45` degrees, drawn as an arc |
| Out-of-range | Clamp at ±45° and show the true numeric offset |
| Motion | Interpolate 120 ms ease-out; fade out 80 ms / in 120 ms on target change |
| Reduced motion | Snap to the new angle; no fade, no interpolation |

The needle must never sweep across the dial when the selected target changes (FR-018).

## Typography and Layout

Ordered top to bottom:

1. App bar: active tuning name (tap → tuning list) and settings action.
2. Mode selector: Auto / Manual / Chromatic (segmented control).
3. Needle gauge (largest element, at least 40% of viewport height).
4. State label (prominent; this is the non-color cue).
5. Readout rows: note + octave, detected Hz (1 decimal), target Hz (1 decimal), cents (signed
   integer).
6. String selector: one chip per string (number + note); in Manual mode it is tappable and the
   chosen string is visibly selected; in Auto/Chromatic it reflects the detected target or is
   inert.
7. Start/Stop primary action, minimum 44×44 pt.

In `betweenStrings`, the readout area lists both candidates, for example:

```text
E2  +250 ¢        A2  −250 ¢
```

## Accessibility Contract

| Element | Semantics |
| --- | --- |
| State label | `aria-live="polite"`, `aria-atomic="true"`; announces only on state transitions, never per frame |
| Gauge (reading) | `role="meter"`, `aria-valuemin="-50"`, `aria-valuemax="50"`, `aria-valuenow="<rounded cents>"`, `aria-valuetext="<note+octave>, <n> cents flat/sharp, <state>"` |
| Gauge (listening / between strings) | `role="group"` with a text description; no meter value is exposed |
| Note name | Plain text, not an image |
| String chips | `role="radio"` group in Manual mode, with `aria-checked` |
| Start / Stop | Single toggle button with `aria-pressed` and a changing accessible name |
| Touch targets | ≥44×44 pt with ≥8 pt spacing |
| Contrast | WCAG 2.1 AA in both themes, including the needle against its track |
| Icons | Decorative icons `aria-hidden="true"`; state never conveyed by icon alone |

Color is never the sole differentiator: the state label always carries the meaning, and the
needle position provides a second cue.

## Theme Tokens

Defined once in `src/theme/variables.scss` and consumed by components:

`--tuner-bg`, `--tuner-surface`, `--tuner-text`, `--tuner-muted`, `--tuner-accent`,
`--tuner-in-tune`, `--tuner-flat`, `--tuner-sharp`, `--tuner-danger`, `--tuner-track`,
`--tuner-center-zone`.

Both `:root[data-theme="light"]` and `:root[data-theme="dark"]` define all of them; the default
follows `prefers-color-scheme` until the user chooses explicitly.

## Test Selectors

Stable attributes for E2E:

| Selector | Element |
| --- | --- |
| `[data-testid="tuner-start"]` | Start/Stop toggle |
| `[data-testid="tuner-state"]` | State label |
| `[data-testid="tuner-needle"]` | Needle element |
| `[data-testid="tuner-note"]` | Note + octave |
| `[data-testid="tuner-detected-hz"]` | Detected frequency |
| `[data-testid="tuner-target-hz"]` | Target frequency |
| `[data-testid="tuner-cents"]` | Signed cents |
| `[data-testid="tuner-between-list"]` | Between-strings candidates |
| `[data-testid="tuner-string-chip"]` | One per string |
| `[data-testid="tuner-mode"]` | Mode selector |

## Behavioral Assertions

1. No state displays "In tune" unless `|cents| ≤ toleranceCents` and a target is selected.
2. `betweenStrings` never marks a string chip as selected and never shows a single target Hz.
3. Switching mode or tuning preserves capture; no restart is required.
4. Changing the reference pitch updates the displayed target and cents on the next frame.
5. When capture stops, all numeric values clear within one frame; no stale value persists.
6. The needle is always rendered inside its track; no layout shift when the value clamps.
