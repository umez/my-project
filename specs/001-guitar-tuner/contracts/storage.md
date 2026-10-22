# Contract: Persistence

**Modules**: `src/app/core/storage/state.repository.ts`, `src/app/core/storage/persisted-state.ts`
**Consumers**: settings page, tunings feature, tuner page, unit tests
**Type**: Single-document repository over `@capacitor/preferences` with a web fallback.

## Storage Key

`zemu.tuner.state.v1` — one JSON document. No other application data is persisted.

## Document Schema

```json
{
  "schemaVersion": 1,
  "settings": {
    "referenceHz": 440,
    "toleranceCents": 5,
    "theme": "system",
    "lastMode": "auto",
    "lastTuningId": "guitar-standard",
    "lastStringOrderByTuning": {}
  },
  "customTunings": []
}
```

## Field Validation

| Field | Rule | On violation |
| --- | --- | --- |
| `schemaVersion` | exactly `1` | Run migration; if unknown, treat as corrupt |
| `settings.referenceHz` | integer 415..466 | Replace with 440 |
| `settings.toleranceCents` | integer 1..50 | Replace with 5 |
| `settings.theme` | `system` \| `light` \| `dark` | Replace with `system` |
| `settings.lastMode` | `auto` \| `manual` \| `chromatic` | Replace with `auto` |
| `settings.lastTuningId` | resolves to an existing preset or custom tuning | Replace with `guitar-standard` |
| `settings.lastStringOrderByTuning` | values are valid `order` for their tuning | Drop invalid entries |
| `customTunings[].id` | unique, non-empty string | Drop the entry |
| `customTunings[].name` | trimmed length 1..40, unique case-insensitive | Drop the entry |
| `customTunings[].strings` | 4..8 valid strings with unique order/stringNumber | Drop the entry |
| `customTunings[].strings[].midi` | integer 0..127 and consistent with note+octave | Drop the entry |

## Operations

```ts
export interface StateRepository {
  load(): Promise<PersistedState>;
  save(state: PersistedState): Promise<void>;   // debounced 250 ms
  flush(): Promise<void>;                       // force pending write on app pause
}
```

- `load()` never throws: on parse failure it resolves with defaults and preserves the raw value
  under `zemu.tuner.state.corrupt` for diagnostics.
- `save()` is debounced; the latest document wins. A rejected write surfaces a non-blocking
  toast ("Settings could not be saved") but does not interrupt tuning.
- `flush()` is called on `appStateChange` → background and on `visibilitychange` → hidden, so a
  pending debounce is never lost.

## Migration

- `schemaVersion` 1 is current.
- A migration registry maps `n → n+1`. Unknown higher versions are not migrated; they are treated
  as corrupt so a newer build's data is never silently destroyed.
- Migrations are pure functions over the parsed document and are covered by unit tests.

## Web Fallback

When `@capacitor/preferences` is unavailable, the same interface uses `localStorage` with the
same key. Behavior, validation, and debounce are identical. Private-mode storage failures fall
back to an in-memory document for the session and show the save warning once.

## Prohibited Data

The document must never contain: audio, PCM samples, detected pitches or pitch history, session
timestamps, device identifiers, or analytics identifiers. A unit test asserts the serialized
document contains no keys outside the schema above.

## Test Coverage

1. Round trip: save a document, reload, deep-equal the result.
2. Each validation rule: corrupt one field, assert only that field is repaired.
3. Corrupt JSON: defaults load, raw payload preserved, no exception.
4. Unknown `schemaVersion`: defaults load, raw payload preserved.
5. Debounce: three rapid saves produce one write.
6. `flush()` writes immediately.
7. Schema allow-list: no unexpected keys after serialization.
