/**
 * Persistence for `AppState`.
 *
 * Writes are debounced (250 ms by default) so dragging a slider does not hammer
 * storage. A corrupt payload is preserved under a backup key before defaults are
 * restored, and every read is normalized.
 */

import {
  DEFAULT_STATE,
  normalizeState,
  type AppState,
  type CustomTuning,
} from './persisted-state';

export const STATE_KEY = 'zemu.tuner.state';
export const CORRUPT_BACKUP_KEY = 'zemu.tuner.state.corrupt';
export const DEFAULT_DEBOUNCE_MS = 250;

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** In-memory store used by tests and as a last-resort fallback. */
export class MemoryStore implements KeyValueStore {
  private readonly entries = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.entries.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.entries.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.entries.delete(key);
  }
}

/** localStorage-backed store for the browser. */
export class WebStorageStore implements KeyValueStore {
  constructor(private readonly storage: Storage) {}

  async get(key: string): Promise<string | null> {
    return this.storage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    this.storage.removeItem(key);
  }
}

/** Capacitor Preferences store, loaded lazily so tests never touch the plugin. */
export class PreferencesStore implements KeyValueStore {
  async get(key: string): Promise<string | null> {
    const { Preferences } = await import('@capacitor/preferences');
    const result = await Preferences.get({ key });
    return result.value;
  }

  async set(key: string, value: string): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value });
  }

  async remove(key: string): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
  }
}

export function createDefaultStore(): KeyValueStore {
  try {
    if (typeof localStorage !== 'undefined') {
      return new WebStorageStore(localStorage);
    }
  } catch {
    // Access can throw in privacy modes; fall through to memory.
  }
  return new MemoryStore();
}

export class StateRepository {
  private state: AppState = DEFAULT_STATE;
  private readonly listeners = new Set<(state: AppState) => void>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private writeChain: Promise<void> = Promise.resolve();
  private corruptPayload: string | null = null;
  private dirty = false;

  constructor(
    private readonly store: KeyValueStore = createDefaultStore(),
    private readonly debounceMs: number = DEFAULT_DEBOUNCE_MS,
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.persistNow);
      document.addEventListener('visibilitychange', this.handleVisibility);
    }
  }

  async load(): Promise<AppState> {
    let raw: string | null = null;
    try {
      raw = await this.store.get(STATE_KEY);
    } catch {
      raw = null;
    }

    if (raw === null) {
      this.state = DEFAULT_STATE;
      this.emit();
      return this.state;
    }

    try {
      this.state = normalizeState(JSON.parse(raw) as unknown);
    } catch {
      this.corruptPayload = raw;
      this.state = DEFAULT_STATE;
      this.writeChain = this.writeChain
        .then(() => this.store.set(CORRUPT_BACKUP_KEY, raw))
        .then(() => this.store.set(STATE_KEY, JSON.stringify(this.state)))
        .catch(() => undefined);
    }

    this.emit();
    return this.state;
  }

  get current(): AppState {
    return this.state;
  }

  /** Raw payload preserved when the stored JSON could not be parsed. */
  get corrupt(): string | null {
    return this.corruptPayload;
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  update(patch: Partial<AppState>): AppState {
    this.state = normalizeState({ ...this.state, ...patch });
    this.dirty = true;
    this.emit();
    this.scheduleSave();
    return this.state;
  }

  setCustomTunings(tunings: readonly CustomTuning[]): AppState {
    return this.update({ customTunings: tunings });
  }

  async flush(): Promise<void> {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.dirty) {
      await this.writeChain;
      return;
    }
    this.dirty = false;
    const snapshot = JSON.stringify(this.state);
    this.writeChain = this.writeChain.then(() => this.store.set(STATE_KEY, snapshot));
    await this.writeChain;
  }

  async reset(): Promise<AppState> {
    this.state = DEFAULT_STATE;
    this.emit();
    await this.store.remove(STATE_KEY);
    return this.state;
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) {
      return;
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.dirty = false;
      const snapshot = JSON.stringify(this.state);
      this.writeChain = this.writeChain.then(() => this.store.set(STATE_KEY, snapshot));
    }, this.debounceMs);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /** Write synchronously before the page is hidden or unloaded. */
  private readonly persistNow = (): void => {
    if (this.saveTimer === null) {
      return;
    }
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.dirty = false;
    const snapshot = JSON.stringify(this.state);
    // WebStorageStore writes synchronously inside this call; awaiting would be
    // too late during pagehide.
    void this.store.set(STATE_KEY, snapshot);
  };

  private readonly handleVisibility = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.persistNow();
    }
  };
}
