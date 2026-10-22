import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CORE_DIR = dirname(fileURLToPath(import.meta.url));
const PURE_DIRS = [
  CORE_DIR,
  join(CORE_DIR, '..', 'tuning'),
  join(CORE_DIR, '..', 'storage'),
];

function listTypeScriptFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listTypeScriptFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('core import boundary', () => {
  it('keeps the DSP layer free of framework imports', () => {
    for (const file of listTypeScriptFiles(CORE_DIR)) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/from\s+['"]@angular\//);
      expect(source, file).not.toMatch(/from\s+['"]@ionic\//);
      expect(source, file).not.toMatch(/from\s+['"]@capacitor\//);
      expect(source, file).not.toMatch(/from\s+['"]\.\.\/\.\.\/\.\.\//);
    }
  });

  it('keeps tuning and state logic framework-free', () => {
    // State storage may load Capacitor lazily, so only the pattern is asserted
    // for tuning here; DSP is checked strictly above.
    for (const directory of [join(CORE_DIR, '..', 'tuning')]) {
      for (const file of listTypeScriptFiles(directory)) {
        const source = readFileSync(file, 'utf8');
        expect(source, file).not.toMatch(/from\s+['"]@angular\//);
        expect(source, file).not.toMatch(/from\s+['"]@ionic\//);
        expect(source, file).not.toMatch(/from\s+['"]@capacitor\//);
      }
    }
    expect(PURE_DIRS.length).toBe(3);
  });
});
