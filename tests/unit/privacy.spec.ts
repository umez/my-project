import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

describe('privacy configuration', () => {
  it('gives Android the microphone permission and no network permission', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toContain('android.permission.RECORD_AUDIO');
    expect(manifest).not.toContain('android.permission.INTERNET');
    expect(manifest).not.toContain('android.permission.ACCESS_NETWORK_STATE');
  });

  it('declares the iOS microphone purpose string', () => {
    const plist = read('ios/App/App/Info.plist');
    expect(plist).toContain('NSMicrophoneUsageDescription');
    expect(plist).not.toContain('NSAllowsArbitraryLoads');
  });

  it('blocks outbound connections in the web content security policy', () => {
    const html = read('src/index.html');
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("object-src 'none'");
    expect(html).toContain("media-src 'none'");
  });

  it('does not include a recording or upload dependency', () => {
    const pkg = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>;
    };
    const names = Object.keys(pkg.dependencies).join(' ').toLowerCase();
    expect(names).not.toContain('analytics');
    expect(names).not.toContain('sentry');
    expect(names).not.toContain('firebase');
  });
});
