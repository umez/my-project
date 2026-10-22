/**
 * TypeScript wrapper for the open-app-settings plugin.
 *
 * Native implementations live in `android/app/src/main/java/.../AppSettingsPlugin.java`
 * and `ios/App/App/AppSettingsPlugin.swift` once the platforms are generated.
 * On the web, callers should fall back to inline instructions.
 */

import { registerPlugin } from '@capacitor/core';

export interface AppSettingsPlugin {
  /** Opens the OS settings page for this application. */
  open(): Promise<void>;
}

export const AppSettings = registerPlugin<AppSettingsPlugin>('AppSettings');
