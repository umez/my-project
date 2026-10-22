import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeState } from './persisted-state';
import {
  CORRUPT_BACKUP_KEY,
  MemoryStore,
  STATE_KEY,
  StateRepository,
} from './state.repository';

afterEach(() => {
  vi.useRealTimers();
});

describe('normalizeState', () => {
  it('returns defaults for garbage', () => {
    expect(normalizeState(null).referenceHz).toBe(440);
    expect(normalizeState('nope').theme).toBe('light');
    expect(normalizeState([]).mode).toBe('auto');
  });

  it('clamps out-of-range settings', () => {
    const state = normalizeState({ referenceHz: 500, toleranceCents: 0 });
    expect(state.referenceHz).toBe(466);
    expect(state.toleranceCents).toBe(1);
  });

  it('rejects unknown enum values', () => {
    const state = normalizeState({ theme: 'neon', mode: 'karaoke' });
    expect(state.theme).toBe('light');
    expect(state.mode).toBe('auto');
  });

  it('drops unknown fields and stamps the current schema version', () => {
    const state = normalizeState({ schemaVersion: 99, extra: 'ignored', referenceHz: 442.4 });
    expect(state.schemaVersion).toBe(1);
    expect(state.referenceHz).toBe(442);
    expect(state).not.toHaveProperty('extra');
  });

  it('rounds fractional settings to integers', () => {
    const state = normalizeState({ referenceHz: 440.6, toleranceCents: 5.7 });
    expect(state.referenceHz).toBe(441);
    expect(state.toleranceCents).toBe(6);
  });

  it('keeps valid custom tunings and drops malformed ones', () => {
    const state = normalizeState({
      customTunings: [
        {
          id: 'open-c',
          name: 'Open C',
          strings: [
            { note: 'C', octave: 2 },
            { note: 'G', octave: 2 },
            { note: 'C', octave: 3 },
            { note: 'E', octave: 3 },
            { note: 'G', octave: 3 },
            { note: 'C', octave: 4 },
          ],
        },
        { id: 'broken', name: 'Broken', strings: [{ note: 'E', octave: 2 }] },
        'not-an-object',
      ],
    });
    expect(state.customTunings).toHaveLength(1);
    expect(state.customTunings[0].id).toBe('open-c');
  });
});

describe('StateRepository', () => {
  it('round-trips state through storage', async () => {
    const store = new MemoryStore();
    const repository = new StateRepository(store, 0);

    repository.update({ referenceHz: 442, toleranceCents: 9 });
    await repository.flush();

    const loaded = await new StateRepository(store).load();
    expect(loaded.referenceHz).toBe(442);
    expect(loaded.toleranceCents).toBe(9);
  });

  it('coalesces rapid updates into one write', async () => {
    vi.useFakeTimers();
    const store = new MemoryStore();
    const setSpy = vi.spyOn(store, 'set');
    const repository = new StateRepository(store, 250);

    repository.update({ referenceHz: 441 });
    repository.update({ referenceHz: 442 });
    repository.update({ referenceHz: 443 });

    expect(setSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(250);
    await repository.flush();

    expect(setSpy).toHaveBeenCalledTimes(1);
    const raw = await store.get(STATE_KEY);
    expect(JSON.parse(raw!).referenceHz).toBe(443);
  });

  it('preserves a corrupt payload and restores defaults', async () => {
    const store = new MemoryStore();
    await store.set(STATE_KEY, '{not json');
    const repository = new StateRepository(store, 0);

    const loaded = await repository.load();
    await repository.flush();

    expect(loaded.referenceHz).toBe(440);
    expect(repository.corrupt).toBe('{not json');
    expect(await store.get(CORRUPT_BACKUP_KEY)).toBe('{not json');
    const repaired = await store.get(STATE_KEY);
    expect(JSON.parse(repaired!).referenceHz).toBe(440);
  });

  it('notifies subscribers on load and update', async () => {
    const store = new MemoryStore();
    const repository = new StateRepository(store, 0);
    const seen: number[] = [];
    const unsubscribe = repository.subscribe((state) => seen.push(state.referenceHz));

    await repository.load();
    repository.update({ referenceHz: 445 });
    unsubscribe();
    repository.update({ referenceHz: 446 });

    expect(seen).toEqual([440, 445]);
  });

  it('persists custom tunings', async () => {
    const store = new MemoryStore();
    const repository = new StateRepository(store, 0);
    await repository.setCustomTunings([
      {
        id: 'custom-1',
        name: 'Open C',
        strings: [
          { note: 'C', octave: 2 },
          { note: 'G', octave: 2 },
          { note: 'C', octave: 3 },
          { note: 'E', octave: 3 },
          { note: 'G', octave: 3 },
          { note: 'C', octave: 4 },
        ],
      },
    ]);
    await repository.flush();

    const loaded = await new StateRepository(store).load();
    expect(loaded.customTunings).toHaveLength(1);
    expect(loaded.customTunings[0].name).toBe('Open C');
  });

  it('resets to defaults and clears storage', async () => {
    const store = new MemoryStore();
    const repository = new StateRepository(store, 0);
    repository.update({ referenceHz: 450 });
    await repository.flush();

    const state = await repository.reset();
    expect(state.referenceHz).toBe(440);
    expect(await store.get(STATE_KEY)).toBeNull();
  });
});
