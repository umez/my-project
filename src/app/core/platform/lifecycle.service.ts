/**
 * Releases the microphone when the app is backgrounded or the tab is hidden.
 */

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LifecycleService {
  private readonly backgroundHandlers = new Set<() => void>();
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibility);
    }

    void import('@capacitor/app')
      .then(({ App }) =>
        App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            this.fire();
          }
        }),
      )
      .catch(() => undefined);
  }

  onBackground(handler: () => void): () => void {
    this.backgroundHandlers.add(handler);
    return () => {
      this.backgroundHandlers.delete(handler);
    };
  }

  private readonly handleVisibility = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.fire();
    }
  };

  private fire(): void {
    for (const handler of this.backgroundHandlers) {
      handler();
    }
  }
}
